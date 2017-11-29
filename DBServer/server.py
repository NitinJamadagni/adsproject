'''
	Usage : python server.py <hostname> <port> <dbFolder>
	Precursors : folder structure expected :
											/dbFolder : 
														ggsx (executable)
														/databases :
																		dbFile1.txt (remember, db file has to end with .txt extension)
																		dbFile1.txt.index.ggsx (remember, index file has to end with .txt.index.ggsx extension)
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

if len(sys.argv) != 4:
	print "Usage : python server.py <hostname> <port> <dbFolder>"

from flask import Flask, jsonify, redirect, url_for, request
import os
from sets import Set
import random
import string
import subprocess
import copy



'''
setup and globals
'''
dbFolder = sys.argv[3]
if dbFolder[-1] != '/' : dbFolder += '/'
datasourceFolder = dbFolder + 'databases/'
queryFolder = dbFolder + 'tempqueries/'
outputFolder = dbFolder + 'outputs/'
app = Flask('db_server')
app.config['UPLOAD_FOLDER'] = queryFolder
GraphID2NameMap = {}



'''
utilities
'''
def randomword(length):
   return ''.join(random.choice(string.lowercase) for i in range(length))


def extractLabels(dbname , readID2Name):
	labels = Set()
	dbpath = datasourceFolder + dbname
	with open(dbpath,'r') as dbfile:
		graphIdCount = 0
		line = dbfile.readline()
		if readID2Name:
			GraphID2NameMap[dbname][str(graphIdCount)] = line.strip()
			graphIdCount += 1
		while len(line) is not 0:
			noOfNodes = int(dbfile.readline().strip())
			for i in range(0,noOfNodes):
				labels.add(dbfile.readline().strip())
			noOfEdges = int(dbfile.readline().strip())
			for i in range(0,noOfEdges) : dbfile.readline()
			line = dbfile.readline()
			if readID2Name and len(line) is not 0:
				GraphID2NameMap[dbname][str(graphIdCount)] = line.strip()
				graphIdCount += 1
	return list(labels)


def getAlchemyFormattedOutput(file,inputTemplate, dbname,):
	# Json structure of the graphs
	'''
		{
			
			"graphId" : [
				{																																|
					"types" : [],"edges" : [ {"source": '', "target" : ''},..] , "nodes" : [ {"id" : '', "label" : '',"node_type" : ''} ]		| -> Each of this is an input to alchemy
				},																																|
				{
					...
				}
			]
		}
	'''
	# get the mappings of queryGraphNodeId : dbGraphNodeId from the output file 
	
	parsedGraphs = {}
	ID2NameMapped = False
	if dbname in GraphID2NameMap.keys():
		ID2NameMapped = True
	with open(file,'r') as outfile:
		for line in outfile:
			mappings = {}
			queryId, dbGraphId, mappingsLine = line.strip().split(':')
			if dbGraphId not in parsedGraphs.keys():
				if ID2NameMapped:
					parsedGraphs[GraphID2NameMap[dbname][dbGraphId]] = []
				else:
					parsedGraphs[dbGraphId] = []
			for pair in list(eval(mappingsLine)):
				mappings[pair[0]] = pair[1]

			graph = copy.deepcopy(inputTemplate)
			# change ids of edges
			for i in range(0,len(graph["edges"])):
				graph["edges"][i]["source"] = mappings[graph["edges"][i]["source"]]
				graph["edges"][i]["target"] = mappings[graph["edges"][i]["target"]]
			# change ids of nodes
			for i in range(0,len(graph["nodes"])):
				graph["nodes"][i]["id"] = mappings[graph["nodes"][i]["id"]]
			if ID2NameMapped:
				parsedGraphs[GraphID2NameMap[dbname][dbGraphId]].append(graph)
			else:
				parsedGraphs[dbGraphId].append(graph)
	return parsedGraphs, ID2NameMapped


def getInputTemplate(inputFile):
	# Json structure of the template
	'''
		{
				"edges" : [ {"source": s_id, "target" : t_id},..] , 
				"nodes" : [ { "id" : _id, "label" : "" } ]
		}
	'''
	template = {"edges" : [], "nodes" : [] }
	labelSet = set();
	with open(inputFile,'r') as queryfile:
		line = queryfile.readline()
		noOfNodes = int(queryfile.readline().strip())
		for i in range(0,noOfNodes):
			label = queryfile.readline().strip()
			labelSet.add(label)
			template["nodes"].append({"id" : i, "label" : label , "node_type" : label})
		noOfEdges = int(queryfile.readline().strip())
		for i in range(0,noOfEdges):
			source, target = map( lambda x : int(x) , queryfile.readline().strip().split(' ') )
			template["edges"].append({"source" : source, "target" : target })
	template["types"] = list(labelSet)
	return template


def parseCmdlineOutput(output):
	stats = {}
	splits = output.strip().split("\t")
	stats["DB_File"] = splits[1]
	stats["Query_File"] = splits[2]
	stats["Query_ID"] = splits[3]
	stats["DB_Load_Time"] = splits[4]
	stats["Query_Build_time"] = splits[5]
	stats["Filtering_Time"] = splits[6]
	stats["Candidates_Count"] = splits[7]
	stats["Matching_Time"] = splits[8]
	stats["Pure_Matching_Time"] = splits[9]
	stats["Matches_Count"] = splits[10]
	stats["Total_Time"] = splits[11]
	return stats
	'''
	DB File	input database file.
	Query File	input queries file.
	Query ID	input query ID. Starting from 0 and following the order in wich the queries are writtern into the file.
	DB Load Time	time to load database index from file.
	Query Build Time	time to build query index.
	Filtering Time	filtering time.
	#Candidates	number of candidate database graphs.
	Matching time	time to match query with candidate graphs.
	Pure Matching time	pure time to match query with candidate graphs.
	#Matches	number of query occurrences found in the database.
	Total Time	total process time just for current query,
	does not include time to load database index.
	Total process time for all queries is not reported. You can calculate it adding total times of each single query plus thie time to load the database.
	'''


def getListOfDatabases(source):
	# NITIN :TODO : Check for faulty .txt files later, idea : check if the same file with .index exists, then it's valid
	return [x for x in os.listdir(source) if x.endswith('.txt') and os.path.isfile(source + '/' + x + '.index.ggsx')]






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
	response["response"] = " 1. GET /help for options 2. GET /getLabels/<dbname> for getting all distinct labels 3. POST /runQuery/<dbbame> to run query and get output, makesure the query file is uploaded from form with enctype attribute set to multipart/form-data and name should be set to queryfile"
	return jsonify(response)

# get all distinct labels in DB
@app.route('/getLabels/<string:dbname>')
def getLabels(dbname):
	response = {}
	if not os.path.isfile(datasourceFolder + dbname):
		response["status"] = 'failure'
		response["response"] = 'No such Database, please check again'
		return jsonify(response)
	readID2Name = False
	if dbname not in GraphID2NameMap.keys():
		readID2Name = True
		GraphID2NameMap[dbname] = {}
	labels = extractLabels(dbname , readID2Name)
	response["status"] = 'success'
	response["response"] = labels
	return jsonify(response)


# run the query file against the dbname, makesure the query file is uploaded from form with enctype attribute set to multipart/form-data, 
# and the name should be set to queryfile, i.e <input type = "file" name = "queryfile" />
@app.route('/runQuery/<string:dbname>', methods = ['POST'])
def runQuery(dbname):
	response = {}
	if not os.path.isfile(datasourceFolder + dbname):
		response["status"] = 'failure'
		response["response"] = 'No such Database, please check again'
		return jsonify(response)


	# get query file, save to temporary folder
	tempQueryFileName =  randomword(10)
	f = request.files['queryfile']
	f.save(queryFolder + tempQueryFileName)


	# run the query against db in the db folder (the index is stored in the same folder), a separate folder for output_file_name
	# ./ggsx -f db_file query_file --strict --all-matches --file-match-output output_file_name
	executable = dbFolder + 'ggsx'
	dbfile = datasourceFolder + dbname
	queryfile = queryFolder + tempQueryFileName
	outfile = outputFolder + tempQueryFileName
	p = subprocess.Popen([executable,'-f',dbfile,queryfile,'--strict','--all-matches','--file-match-output',outfile],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
	out, err = p.communicate()
	if len(err) > 0:
		response["status"] = 'failure'
		response["response"] = 'Error in query execution, please try again'
		return jsonify(response)
	out =  parseCmdlineOutput(out)
	response["status"] = 'success'
	response["response"] = {
		"stats" : out
	}

	



	# getInputTemplate on queryFile
	template = getInputTemplate(queryfile)
	#send output_file_name to get parsed, send the input template as parameter
	parsedGraphs, ID2NameMapped = getAlchemyFormattedOutput(outfile, template, dbname)

	# delete the query file, delete the output_file from their folders
	os.remove(queryfile)
	os.remove(outfile)

	# jsonify the parsed output and return
	response["response"]["output"] = parsedGraphs
	response["response"]["ID2NameMapped"] = ID2NameMapped
	return jsonify(response)


@app.route('/getDatabaseNames')
def getDatabaseNames():
	response = {}
	dbs = getListOfDatabases(datasourceFolder)
	response["status"] = "success"
	response["response"] = dbs
	return jsonify(response)	






'''
program flow
'''
if __name__== '__main__':
	# host = "192.168.43.44"
	app.run(host = sys.argv[1],port=int(sys.argv[2]),debug=True)



