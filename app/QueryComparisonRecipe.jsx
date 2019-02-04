import QueryModel from './model/QueryModel';
import QueryFactory from './components/search/QueryFactory';
import SearchAPI from './api/SearchAPI';
import FlexModal from './components/FlexModal';

import IDUtil from './util/IDUtil';
import ElasticsearchDataUtil from './util/ElasticsearchDataUtil';
import QueryComparisonLineChart from './components/stats/QueryComparisonLineChart';
import ComparisonHistogram from './components/stats/ComparisonHistogram';
import ProjectSelector from './components/workspace/projects/ProjectSelector';
import ProjectQueriesTable from './components/workspace/projects/query/ProjectQueriesTable';
import CollectionUtil from './util/CollectionUtil';

import PropTypes from 'prop-types';
import ComponentUtil from "./util/ComponentUtil";
import {initHelp} from './components/workspace/helpers/helpDoc';

/*
Notes about this component:

- Top component receiving the URL parameters
- Generates search components based on the configured search recipe
- Passes the URL parameters to search components, who already have implemented the search history
	- Each search component (e.g. facet search, fragment search) implements its own way of persisting search history
- FIXME temporarily draws an 'Export' button that hooks up to the annotation export functionality of the recipe
	- This should be in the user space
- Holds the annotation box that can be triggered from underlying (search) components
- Holds the line chart that can be triggered from underlying components
*/

class QueryComparisonRecipe extends React.Component {
    constructor(props) {
        super(props);
        let collections = null;
        if(this.props.params.cids) {
            collections = this.props.params.cids.split(',');
        } else if(this.props.recipe.ingredients.collections) {
            collections = this.props.recipe.ingredients.collections;
        }

        this.state = {
            lineChartData: {},
            barChartData: {},
            collections : collections,
            chartType : this.props.recipe.ingredients.output ? this.props.recipe.ingredients.output : 'lineChart',
            data : null,
            selectedQueriesId: null,
            pageSize : 10,
            selectedQueries : [],
            activeProject : ComponentUtil.getJSONFromLocalStorage('activeProject'),
            showModal : false, //for the collection selector
            awaitingProcess : null, //which process is awaiting the output of the project selector
        };
        this.layout = document.querySelector("body");
    }

    componentDidMount(){
        initHelp("Compare", "/feature-doc/tools/query-comparison");
    }

    //this function receives all output of components that generate output and orchestrates where
    //to pass it to based on the ingredients of the recipe
    //TODO change this, so it knows what to do based on the recipe
    onComponentOutput(componentClass, data) {
        if(componentClass === 'QueryFactory') {
            this.onSearched(data);
        } else if(componentClass === 'ProjectSelector') {
            this.setState(
                {
                    activeProject: data,
                    lineChartData: null,
                    barChartData : null
                },
                () => {
                    this.onProjectChanged.call(this, data)
                }
            );
        }
    }

    /* ------------------------------------------------------------------------------
    ------------------------------- SEARCH RELATED FUNCTIONS --------------------
    ------------------------------------------------------------------------------- */
    onProjectChanged(project) {
        ComponentUtil.storeJSONInLocalStorage('activeProject', project);
        ComponentUtil.hideModal(this, 'showProjectModal', 'project__modal', true, () => {
            if(this.state.awaitingProcess) {
                switch(this.state.awaitingProcess) {
                    case 'bookmark' : this.selectBookmarkGroup(); break;
                    case 'saveQuery' : this.showQueryModal(); break;
                }
            }
        });
    }

    async getData(singleQuery) {
        const that = this,
              collectionId = singleQuery.query.collectionId,
              clientId = that.props.clientId,
              user = that.props.user;

        return new Promise(function(resolve, reject) {
            CollectionUtil.generateCollectionConfig(clientId, user, collectionId, (collectionConfig) => {
                const desiredFacets = singleQuery.query.desiredFacets,
                    field = collectionConfig.getPreferredDateField() || null;
                if(field !== null) {
                    desiredFacets.push({
                        "field": field,
                        "id": field,
                        "title": collectionConfig.toPrettyFieldName(field),
                        "type": "date_histogram"
                    });
                }

                const query = QueryModel.ensureQuery(singleQuery.query, collectionConfig);

                query.fragmentFields = null;
                query.fragmentPath = null;
                query.desiredFacets = desiredFacets;
                // TODO : remove call to CKANAPI since the title for the collection is in the collectionConfig
                SearchAPI.search(
                    query,
                    collectionConfig,
                    data => {
                        if (data === null && typeof data === "object") {
                            reject(data => {
                                    if (data === null)
                                        return 'rejected'
                                }
                            )
                        } else {
                            resolve(data)
                        }
                    },
                    false
                )
            })
        }).catch(err => console.log('No data returned from query', err));
    }

    async processData(queries) {
        const random = Math.floor(Math.random() * 1000) + 1;
        const promises = queries.map(query => this.getData(query));
        let queriesData = {};
        await Promise.all(promises).then(
            (dataPerQuery) => {
                dataPerQuery.map(data => {
                    if(data && data.query) {
                        let queryObj = {};
                        queryObj.data = ElasticsearchDataUtil.searchResultsToTimeLineData(
                            data.query,
                            data.aggregations,
                        );
                        queryObj.comparisonId = data.query.id;
                        queryObj.query = data.query;
                        queryObj.collectionConfig = data.collectionConfig;
                        queriesData[data.query.id] = queryObj;
                    } else {
                        console.debug('no data', data)
                    }
                });
                this.setState({
                    lineChartData: queriesData,
                    barChartData: dataPerQuery,
                    selectedQueriesId : random
                }, () => this.layout.classList.remove("spinner"))
            },
        )
    }

    onOutput(data) {
         if(!data) { //if there are no results
            console.log('Your query did not yield any results');
        } else if(data.pagingOutOfBounds) { //due to ES limitations
            console.log('The last page cannot be retrieved, please refine your search');
        } else {
            if(data.deleted === true && data.queryId) { //the query factory deleted a query
                delete csr[data.queryId];
                delete lineChartData[data.queryId];
                delete barChartData[data.queryId];
            } else { //the data is the same stuff returned by a QueryBuilder

            }
        }
    }

    compareQueries(selection) {
        this.setState({
            selectedQueries : selection
        }, () => this.processData(this.state.selectedQueries))
    }

    __getBaseUrl() {
        const temp = window.location.href;
        const arr = temp.split("/");
        return arr[0] + "//" + arr[2];
    }

    goToSingleSearch() {
        document.location.href = this.__getBaseUrl() + '/tool/single-search';
    }

    switchGraphType() {
        this.setState({
            chartType : this.state.chartType === 'lineChart' ? 'histogram' : 'lineChart'
            }
        )
    }

    render() {
        const compareLink = {"label": "Combine queries ..."};
        const chooseProjectBtn = (
            <button className="btn btn-primary" onClick={ComponentUtil.showModal.bind(this, this, 'showProjectModal')}>
                Set project ({this.state.activeProject ? this.state.activeProject.name : 'none selected'})
            </button>
        );
        //generates a tabbed pane with a search component for each collection + a collection browser
        const searchComponent = (
            <button className="btn btn-primary"
                    onClick={this.goToSingleSearch.bind(this)}>Add query&nbsp;<i className="fa fa-plus"/></button>
        );

        let chart = null;
        let aggregatedHits = null;
        let projectModal = null;
        let projectQueriesTable = null;
        let graphTypeBtn = null;

        if(this.state.activeProject) {
            const graphTypeText = this.state.chartType === 'lineChart' ? 'Histogram' : 'Line Chart';

            projectQueriesTable = (
                <div className={IDUtil.cssClassName('project-queries-view')}>
                    <ProjectQueriesTable
                        key={this.state.activeProject.id}
                        handleCompareLink={this.compareQueries.bind(this)}
                        compareQueryLink={compareLink}
                        project={this.state.activeProject}
                        user={this.props.user}/>
                </div>
            );

            if(this.state.lineChartData && Object.keys(this.state.lineChartData).length > 0) {
                graphTypeBtn = (
                    <button
                        onClick={this.switchGraphType.bind(this)}
                        type="button"
                        className="btn btn-primary btn-xs bg__switch-type-btn">
                        {graphTypeText}
                    </button>);

                if(this.state.chartType === 'lineChart') {
                    chart = (
                        <QueryComparisonLineChart
                            data={this.state.lineChartData}
                            key={this.state.selectedQueriesId}
                            selectedQueries={this.state.selectedQueries}
                        />
                    );
                } else {
                    chart = (
                        <ComparisonHistogram
                            data={this.state.barChartData}
                            key={this.state.selectedQueriesId}
                            selectedQueries={this.state.selectedQueries}
                        />
                    );
                }
            }
        }

        //project modal
        if(this.state.showProjectModal) {
            projectModal = (
                <FlexModal
                    elementId="project__modal"
                    stateVariable="showProjectModal"
                    owner={this}
                    size="large"
                    title="Set the active project">
                    <ProjectSelector onOutput={this.onComponentOutput.bind(this)} user={this.props.user}/>
                </FlexModal>
            )
        }
        return (
            <div className={IDUtil.cssClassName('comparative-search-recipe')}>
                <div className="overlay"/>
                <div className="row">
                    <div className="bg__queryComparisonRecipe-header-btns">
                        {searchComponent}&nbsp;{chooseProjectBtn}
                    </div>
                    {projectModal}
                    {projectQueriesTable}
                </div>
                <div className="row">
                    <div className="col-md-12 bg__comparative-graphs">
                        {graphTypeBtn}
                        {chart}
                    </div>
                </div>
                {aggregatedHits}
            </div>
        );
    }
}

QueryComparisonRecipe.propTypes = {
    clientId : PropTypes.string,

    user: PropTypes.shape({
        id: PropTypes.number.isRequired
    })

};

export default QueryComparisonRecipe;
