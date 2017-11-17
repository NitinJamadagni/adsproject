'''
	Usage : python server.py <port> <dbFolder>
	Precursors : folder structure expected :
											/dbFolder : 
														ggsx (executable)
														dbFile1
														dbFile1.index
														.
														.
														/queries :	
																	query_name	(temporary)
																	.
																	.
														/outputs :
																	query_name	(temporary)	
																	.
																	.
'''					


'''
imports
'''
import sys

if len(sys.argv) != 3:
	print "Usage : python server.py <port> <dbFolder>"

from flask import Flask, jsonify, redirect, url_for, request
import os
from sets import Set
import random
import string
import subprocess



'''
setup and globals
'''
dbFolder = sys.argv[2]
if dbFolder[-1] != '/' : dbFolder += '/'
queryFolder = dbFolder + 'queries/'
outputFolder = dbFolder + 'outputs/'
app = Flask('db_server')
app.config['UPLOAD_FOLDER'] = queryFolder



'''
utilities
'''
def randomword(length):
   return ''.join(random.choice(string.lowercase) for i in range(length))


def extractLabels(dbpath):
	labels = Set()
	with open(dbpath,'r') as dbfile:
		line = dbfile.readline()
		while len(line) is not 0:
			noOfNodes = int(dbfile.readline().strip())
			for i in range(0,noOfNodes):
				labels.add(dbfile.readline().strip())
			noOfEdges = int(dbfile.readline().strip())
			for i in range(0,noOfEdges) : dbfile.readline()
			line = dbfile.readline()
	return list(labels)


def getAlchemyFormattedOutput(file,inputTemplate):
	# Json structure of the graphs
	'''
		{
			"graphId" : [
				{																								|
					"edges" : [ {"source": '', "target" : ''},..] , "nodes" : [ {"id" : '', "label" : ''} ]		| -> Each of this is an input to alchemy
				},																								|
				{
					...
				}
			]
		}
	'''
	# get the mappings of queryGraphNodeId : dbGraphNodeId from the output file 
	
	parsedGraphs = {}
	with open(file,'r') as outfile:
		for line in outfile:
			mappings = {}
			queryId, dbGraphId, mappingsLine = line.strip().split(':')
			if dbGraphId not in parsedGraphs.keys():
				parsedGraphs[dbGraphId] = []
			for pair in list(eval(mappingsLine)):
				mappings[pair[0]] = mappings[pair[1]]

			graph = inputTemplate
			# change ids of edges
			for i in range(0,len(graph["edges"])):
				graph["edges"][i]["source"] = mappings[graph["edges"][i]["source"]]
				graph["edges"][i]["target"] = mappings[graph["edges"][i]["target"]]
			# change ids of nodes
			for i in range(0,len(graph["nodes"])):
				graph["nodes"][i]["id"] = mappings[graph["nodes"][i]["id"]]
			parsedGraphs[dbGraphId].append(graph)
	return parsedGraphs


def getInputTemplate(inputFile):
	# Json structure of the template
	'''
		{
				"edges" : [ {"source": s_id, "target" : t_id},..] , 
				"nodes" : [ { "id" : _id, "label" : "" } ]
		}
	'''
	template = {"edges" : [], "nodes" : []}
	with open(inputFile,'r') as queryfile:
		line = queryfile.readline()
		noOfNodes = int(queryfile.readline().strip())
		for i in range(0,noOfNodes):
			template["nodes"].append({"id" : i, "label" : queryfile.readline().strip()})
		noOfEdges = int(queryfile.readline().strip())
		for i in range(0,noOfEdges):
			source, target = map( lambda x : int(x) , queryfile.readline().strip().split(' ') )
			template["edges"].append({"source" : source, "target" : target })
	return template









'''
main functionalities
'''
@app.route('/' , methods = ['GET','POST'])
def home():
	return redirect(url_for('help'))

# helper method
@app.route('/help', methods = ['GET'])
def help():
	response = {}
	response["status"] = "success"
	response["response"] = " 1. GET /help for options\n 2. GET /getLabels/<dbname> for getting all distinct labels\n 3. POST /runQuery/<dbbame> to run query and get output, makesure the query file is uploaded from form with enctype attribute set to ‘multipart/form-data’ and name should be set to 'queryfile'"
	return jsonify(response)

# get all distinct labels in DB
@app.route('/getLabels/<string:dbname>')
def getLabels(dbname):
	response = {}
	if not os.path.isfile(dbFolder + dbname):
		response["status"] = 'failure'
		response["response"] = 'No such Database, please check again'
		return jsonify(response)
	labels = extractLabels(dbFolder+dbname)
	response["status"] = 'success'
	response["response"] = labels
	return jsonify(response)


# run the query file against the dbname, makesure the query file is uploaded from form with enctype attribute set to ‘multipart/form-data’, 
# and the name should be set to 'queryfile', i.e <input type = "file" name = "queryfile" />
@app.route('/runQuery/<string:dbname>', methods = ['POST'])
def runQuery(dbname):
	response = {}
	if not os.path.isfile(dbFolder + dbname):
		response["status"] = 'failure'
		response["response"] = 'No such Database, please check again'
		return jsonify(response)


	# get query file, save to temporary folder
	tempQueryFileName =  randomword(10)
	f = request.files['queryfile']
	f.save(tempQueryFileName)


	# run the query against db in the db folder (the index is stored in the same folder), a separate folder for output_file_name
	# ./ggsx -f db_file query_file --strict --all-matches --file-match-output output_file_name
	executable = dbFolder + 'ggsx'
	dbfile = dbFolder + dbname
	queryfile = queryFolder + tempQueryFileName
	outfile = outputFolder + tempQueryFileName
	p = subprocess.Popen([executable,'-f',dbfile,queryfile,'--strict','--all-matches','--file-match-output',outfile],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
	out, err = p.communicate()
	if len(err) > 0:
		response["status"] = 'failure'
		response["response"] = 'Error in query execution, please try again'
		return jsonify(response)
	response["status"] = 'success'
	response["response"] = {
		"stats" : out
	}


	# getInputTemplate on queryFile
	template = getInputTemplate(queryfile)
	#send output_file_name to get parsed, send the input template as parameter
	parsedGraphs = getAlchemyFormattedOutput(outfile, template)

	# delete the query file, delete the output_file from their folders
	os.remove(queryfile)
	os.remove(outfile)

	# jsonify the parsed output and return
	response["response"]["output"] = parsedGraphs
	return jsonify(response)




'''
program flow
'''
if __name__== '__main__':
	app.run(port=int(sys.argv[1]),debug=True)
