import IDUtil from '../util/IDUtil';
import TimeUtil from "../util/TimeUtil";

const QueryModel = {

	//when a collectionConfig is provided, it means that defaults from this should be used to populate the query object
	ensureQuery : function(obj, collectionConfig) {
		obj = obj || {};
		return {
			//give the query an ID for internal reference (e.g. for components that can handle multiple queries)
			id : obj.id || IDUtil.guid(),

			//the collection to search through TODO validate that this is always filled in!!!!
			collectionId : (collectionConfig ? collectionConfig.getSearchIndex() : obj.collectionId) || null,

			//what layers to search through (always check them with the collection config)
			searchLayers: QueryModel.determineSearchLayers(obj, collectionConfig),

			nestedSearchLayers: obj.nestedSearchLayers || collectionConfig.getNestedSearchLayers(),

			//the search term entered by the user
			term: obj.term || '',

			//the selected date field and range (start/end dates)
			dateRange: obj.dateRange || null, //not looking at collecitonConfig

			//currently only clusters of fields are supported for field-specific search (both in the UI and search API)
			//field clusters can be defined by subclassing CollectionConfig and implementing getMetadataFieldCategories()
			fieldCategory: obj.fieldCategory || null,

			//filters selected by the user (by selecting certain values from the desiredFacets)
			selectedFacets: obj.selectedFacets || {},

			//which aggregations should be included next to the search results
			desiredFacets: obj.desiredFacets || QueryModel.getInitialDesiredFacets(obj, collectionConfig),

			//sort by a certain field and order (asc/desc)
			sort: obj.sort && obj.sort.field ? obj.sort : { "field": "_score", "order": "desc"},

			//used for paging
			offset: obj.offset || 0,
			size: obj.size || 20,

			//(fragment search only) define the path to the desired nested document, e.g. document.page.paragraph
			fragmentPath: obj.fragmentPath || collectionConfig ? collectionConfig.getFragmentPath() : null,

			//(fragment search only) define which fields of the indicated nested document to retrieve
			fragmentFields: obj.fragmentFields || collectionConfig ? collectionConfig.getFragmentTextFields() : null,

			//(fragment search only) decide whether to return sub fragments as well
			//(e.g. when retrieving a paragraph it's possible to exclude the list of sentences)
			includeFragmentChildren: obj.includeFragmentChildren === true ? true : collectionConfig && collectionConfig.includeFragmentChildren(),

			//(fragment search only) decide whether to search/retrieve the document level as well
			includeMediaObjects: obj.includeMediaObjects === false ? false : collectionConfig && collectionConfig.includeMediaObjects(),

			//paging within inner hits is not really supported/reflected by the UI (yet)
			innerHitsOffset: obj.innerHitsOffset || 0,
			innerHitsSize: obj.innerHitsSize || 5,

			//remove certain fields from the returned data
			exclude: obj.exclude || collectionConfig ? collectionConfig.getFieldsToExclude() : null,

			searchId : obj.searchId || null
		};
	},

	determineSearchLayers(query, config) {
		let searchLayers = null;
		let foundLayer = false;
		if(config && config.getCollectionIndices()) {
			searchLayers = {};
			config.getCollectionIndices().forEach((layer) => {
				if(query && query.searchLayers) {
					if(query.searchLayers[layer] !== undefined) {
						searchLayers[layer] = query.searchLayers[layer];
						foundLayer = true;
					} else {
						searchLayers[layer] = false;
					}
				} else { //include all default layers
					searchLayers[layer] = true;
					foundLayer = true;
				}
			});
		}
		//if for some shitty reason the search layer (entered in the URL) does not match the collection ID
		//just set it manually (maybe this is being too nice)
		if(!foundLayer) {
			searchLayers = {};
			searchLayers[config.getCollectionId()] = true;
		}
		return searchLayers;
	},

	getInitialDesiredFacets(query, config) {
		let df = config ? config.getFacets() : null || [];
		if(query.dateRange && query.dateRange.field) {
			df.push({
				field: query.dateRange.field,
				title : config.toPrettyFieldName(query.dateRange.field),
				id : query.dateRange.field,
				type : 'date_histogram'
			});
		}
		return df;
	},

	toHumanReadableString(query) {
		if(query) {
			const strList = [];
			if(query.term) {
				strList.push('Search term: ' + query.term);
			} else {
				strList.push('No search term');
			}
			if(query.selectedFacets && Object.keys(query.selectedFacets).length > 0) {
				strList.push('# filters: ' + Object.keys(query.selectedFacets).length);
			}
			return strList.join('; ');
		}
		return null;
	},

    /* --------------------------------- FOR COPYING A QUERY TO THE CLIPBOARD ---------------------------------- */

    queryDetailsToClipboard(query) {
        if (query) {
            const queryDetailsHeader = "Query details\r\r",
                queryName = "Name: " + query.name + "\r",
                dateFieldName = query.query.dateRange && query.query.dateRange.field
                    ? " Name: " + query.query.dateRange.field + "\n" : "",
                startDate = query.query.dateRange && query.query.dateRange.start
                    ? " Start: " + TimeUtil.UNIXTimeToPrettyDate(query.query.dateRange.start) + "\r" : "",
                endDate = query.query.dateRange && query.query.dateRange.end
                    ? " End: " + TimeUtil.UNIXTimeToPrettyDate(query.query.dateRange.end) + "\r" : "",
                date = dateFieldName || startDate || endDate
                    ? "Date Field: \r" + dateFieldName + startDate + endDate + "\r"
                    : "",
                searchTerm = query.query.term
                    ? "Search Term: " + query.query.term + "\r" : "",
                selectedFacets = query.query.selectedFacets ? QueryModel.__getSelectedFacetsToClipboard(query.query.selectedFacets) : "",
                fieldCategory = query.query.fieldCategory && query.query.fieldCategory.length > 0
                    ? QueryModel.__getFieldsCategoryToClipboard(query.query.fieldCategory) : "";
            return queryDetailsHeader + queryName + searchTerm + date + fieldCategory + selectedFacets;
        } else {
            return null;
        }
    },

    __getSelectedFacetsToClipboard(selectedFacets) {
        if (selectedFacets && Object.keys(selectedFacets).length > 0 && selectedFacets.constructor === Object) {
        	let text = "Selected facets\r";
            const keys = Object.keys(selectedFacets);
            keys.forEach(k => {
                text += "Facet name: " + k + " \r";
                selectedFacets[k].map(facet => {
                    text += " " + facet + "\r";
                });
                text += "\r";
            });
            text += "\r";
            return text;
        }
        return ''
    },

	__getFieldsCategoryToClipboard(fieldCategories) {
        if (fieldCategories) {
        	let text = "Selected field categories\r";
            fieldCategories.forEach(item => text += " " + item.label + "\r")
            text += "\r";
            return text;
        }
        return ''
    }

};

export default QueryModel;
