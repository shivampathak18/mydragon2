/**
 * Controller which handles requests/responses relating to sc-search
 *
 * @type {sc-searchDao|exports}
 */
var SearchLib = require('./search-lib');
var _ = require('underscore');
var Q = require('q');
var SearchDao = require('./search-dao');

var ddg = require('ddg');

/**
* Search happens here
*
* @param req
* @param reply
*/
var _this = this;
exports.search = function(request, reply) {
	var searchResponse= {};
	Q.allSettled([_this.searchES(request,reply)])
	.then(function (results) {
		results.forEach(function (result,index) {
			//console.log('result.state',result.state);
			if (result.state === "fulfilled") {
				searchResponse = _.extend(searchResponse, result.value);
				/*if(index == 0){
					searchResponse = SearchLib.includeCustomFilters(searchResponse);
				}*/	
				
			} else {
				var reason = result.reason;
				eventEmitter.emit('search:error',result.reason);
			}
		});
		//console.log(searchResponse);
		reply(searchResponse);
	})
	.catch(function(response) {
			console.log(arguments);
			reply({});
	});
};
exports.createOptionsforFieldMatch = function(optionsArray,options){

	for(var option in optionsArray){
		options[option] = optionsArray[option];
	};
	return options;
};



/**
* Suggestions happen here
*
* @param req
* @param reply
*/

/*
Tags Suggest Endpoint
*/
exports.tagsSuggest = function(request,reply){
	var inputString = request.params.inputString;
	var queryString = request.params.queryString;
	var _this = this;
	//var dfd = Q.defer();
	var funcArr = [SearchLib.startSuggestion(inputString,'tags_suggest')];
	var suggestOptions= [];
	var replyResponse = {'tagsSuggestion':suggestOptions};
	var matchingInputString = inputString.toLowerCase();
	Q.allSettled(funcArr)
	.then(function (results) {
		results.forEach(function (result,index) {
			if (result.state === "fulfilled") {
				if(result.value.length != 0) {
					//suggestOptions = suggestOptions.concat(result.value.payload.suggest_value);
					result.value.forEach(function(option,i){
						option.payload.suggest_value.forEach(function(string,stringIndex){
							if(string.toLowerCase().indexOf(matchingInputString) > -1){
								if(suggestOptions.indexOf(string) === -1)
									suggestOptions.push({'val':string,'text':string});
							}
						});							
					});

				} else {
					var reason = result.reason;
					eventEmitter.emit('search:error',result.reason);
				}
			}
		});
		if (!_.isEmpty(suggestOptions)) {
			replyResponse = {'tagsSuggestion':suggestOptions};
			reply(replyResponse);
			
		} else {
			// Removing duplicates from the suggestions
//			var map = {};
//			var finalOptions = [];
//			_.each(suggestOptions, function(option) {
//				if (map[option.payload.path] === undefined) {
//					map[option.payload.path] = true;
//					finalOptions.push(option);
//				}
//			});			
			reply(replyResponse);
		}
	});
}

exports.searchSuggest = function(request,reply) {
	console.log('auth-',request.auth);

	var queryString = request.params.queryString;
	var _this = this;
	//var dfd = Q.defer();


	// Add readable paths to options. default to only /sc prefix
	var creds = request.auth.credentials
	var options = {_readable_prefixes : (creds && creds._allowed_read_prefixes
					|| ['/sc'])}

	var funcArr = [SearchLib.startSuggestion(queryString,'title_suggest'),
	SearchLib.startSuggestion(queryString,'description_suggest'),
	SearchLib.startSuggestion(queryString,'tags_suggest'),
	SearchLib.startSuggestion(queryString,'category_suggest'),
	SearchLib.startSuggestion(queryString,'frequency_suggest'),
	SearchLib.startSuggestion(queryString,'source_type_suggest'),
	SearchLib.startSuggestion(queryString,'data_granularity_suggest')];
	var suggestOptions= [];
	Q.allSettled(funcArr)
	.then(function (results) {
		results.forEach(function (result,index) {
			if (result.state === "fulfilled") {
				if(result.value.length != 0) {
					var values = _.filter(result.value, function(value){
						return _.some(options._readable_prefixes,
							function(prefix){
								return prefix == value.payload.path.slice(
													0, prefix.length)

						})
					})
					suggestOptions = suggestOptions.concat(values);

				} else {
					var reason = result.reason;
					eventEmitter.emit('search:error',result.reason);
				}
			}
		});
		if (!_.isEmpty(suggestOptions)) {
			reply(suggestOptions);
		} else {
			// Removing duplicates from the suggestions
//			var map = {};
//			var finalOptions = [];
//			_.each(suggestOptions, function(option) {
//				if (map[option.payload.path] === undefined) {
//					map[option.payload.path] = true;
//					finalOptions.push(option);
//				}
//			});
			console.log('empty suggestions. Start search on leaf');
			
			SearchLib.searchInLeaf_suggestion(queryString, options)
			.then(function(response) {
				//console.log('response-',JSON.stringify(response));
				var suggestResponse = SearchLib.createLeafSuggestResponse(response);
				//searchResponse = SearchLib.includeCustomFilters(searchResponse,'searchForLeaf');
				reply(suggestResponse);
			})
			.catch(function(response) {
				console.log(arguments);
				reply([]);
			});
			//reply(suggestOptions);
		}
	});
};



exports.searchES = function(request, reply) {
	var dfd = Q.defer();
	var queryString = request.params.queryString;
	var options = request.query;

	// Add readable paths to options. default to only /sc prefix
	var creds = request.auth.credentials
	options['_readable_prefixes'] = (creds && creds._allowed_read_prefixes
								  	 || ['/sc'])

	/**
	* If the user doesn't request to filter by parent path, assume it's a default
	* search request
	*/
	if (!(_.isEmpty(options.parent_path))) {
		//console.log('search under parent');
		SearchLib.searchUnderParent(queryString, options)		
		.then(function(response) {
			var searchResponse = SearchLib.createParentSearchResponse(response);
			dfd.resolve(searchResponse);
		})
		.catch(function(response) {
			console.log(arguments);
			dfd.reject({ error: response });
		});
	} else if (!(_.isEmpty(options.leaf_path))) {
		//console.log('search for leaf');
		SearchLib.searchForLeaf(queryString, options)
		.then(function(response) {
			var searchResponse = SearchLib.createLeafSearchResponse(response);
			searchResponse = SearchLib.includeCustomFilters(searchResponse,'searchForLeaf');
			//searchResponse = SearchLib.includeFilterDetails(response,searchResponse);
			dfd.resolve(searchResponse);
		})
		.catch(function(response) {
			console.log(arguments);
			dfd.reject({error: response});
		});
	} else {
		//console.log('filters query');
		SearchLib.search(queryString, options)
		.then(function(response) {
			options.aliases = {};
			options.from = (typeof options.from === 'undefined')? 0: options.from;
			var	searchResponse = SearchLib.processAgg(response, options);
			console.log('process agg successful');
			console.log(JSON.stringify(searchResponse));
			searchResponse = SearchLib.includeFilterDetails(response,searchResponse);
			if (request.params.queryString === searchResponse.didYouMean) {
				searchResponse.didYouMean = '';
			}
			dfd.resolve(searchResponse);
		})
		.catch(function(response) {
			console.log(arguments);
			dfd.reject({ error: response });
		});
	}
	return dfd.promise;
};


exports.searchForExcelPlugin = function(request, reply){
	// var path = request.path.replace('/fe', '')
	_this.searchES(request, reply)
	.then(function(results){
		// console.log(res.hits)
		var result = results;
		var response = _.pluck(result.hits, 'hits');
		response = _.flatten(response);
		
		headers = '"Title"$$$"Path"$$$"Source"\n'
		response = _.map(response, function(leaf){
			return ('"' + leaf.metadata.title + '"$$$"'
					+ leaf.path + '"$$$'
					+ '"' + leaf.metadata.source_name + '"')
		})
		reply(headers + response.join("\n"))
		.header('Content-Type', 'text/3dsv')
		.header('Content-Disposition', 'inline; filename="results.csv"');
	})
}