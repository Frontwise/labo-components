import QueryModel from '../../../../model/QueryModel';

import ProjectAPI from '../../../../api/ProjectAPI';

import IDUtil from '../../../../util/IDUtil';
import FlexRouter from '../../../../util/FlexRouter';

import SortTable from '../../SortTable';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';

import CopyToClipboard from '../../../helpers/CopyToClipboard';
import MessageHelper from '../../../helpers/MessageHelper';

class ProjectQueriesTable extends React.PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            queries: [],
            selectedQueries: [],
            filter: {
                keywords: '',
                currentUser: false
            }
        };
    }

    componentDidMount() {
        this.loadData();
    }

    componentDidUpdate() {
        if (this.lastFilter !== this.state.filter) {
            this.lastFilter = this.state.filter;
            this.loadData();
        }
    }

    //whenever the keywords change
    keywordsChange(e) {
        this.setState({
            filter: Object.assign({}, this.state.filter, {
                keywords: e.target.value
            })
        });
    }

    //whenever the checkbox changes
    currentUserChange(e) {
        this.setState({
            filter: Object.assign({}, this.state.filter, {
                currentUser: e.target.checked
            })
        });
    }

    //load the query data and apply the current filter
    loadData() {
        let result = this.props.project.queries ? this.props.project.queries : [];
        const filter = this.state.filter;

        result = this.filterQueries(result, filter);

        // update state
        this.setState({
            queries: result
        });
    }

    //Filter query list by given filter
    filterQueries(queries, filter) {
        // filter on keywords in name or tool
        if (filter.keywords) {
            const keywords = filter.keywords.split(' ');
            keywords.forEach(k => {
                k = k.toLowerCase();
                queries = queries.filter(
                    query =>
                    query.name.toLowerCase().includes(k)
                );
            });
        }

        return queries;
    }

    viewQuery(query) {
        const selectedQuery = this.state.queries.filter(q => q.name === query.name);
        if(selectedQuery.length > 0) {
            FlexRouter.gotoSingleSearch(this.props.project.id + '__' + selectedQuery[0].query.id);
        }
    }

    deleteQuery(query) {
        if (window.confirm('Are you sure you want to delete query ' + query.name)) {
            const project = this.props.project;

            // delete queries from project
            project.queries = project.queries.filter(s => s !== query);

            // store project
            ProjectAPI.save(this.props.user.id, project, msg => {
                if (msg) {
                    // update data
                    this.loadData();
                } else {
                    alert('An error occured while saving this project');
                }
            });
        }
    }

    //deletes multiple queries
    deleteQueries(queries) {
        if (window.confirm('Are you sure you want to delete ' + queries.length + ' queries?')) {
            const project = this.props.project;

            // delete queries from project
            project.queries = project.queries.filter(q => !queries.includes(q));

            // store project
            ProjectAPI.save(this.props.user.id, project, msg => {
                if (msg) {
                    // update data
                    this.loadData();
                } else {
                    alert('An error occured while saving this project');
                }
            });
        }
    }

    onSelectQuery(item){
        this.setState({
            selectedQueries: item
        })
    }

    sortQueries(queries, sort) {
        const sorted = queries;
        switch (sort.field) {
            case 'name': sorted.sort((a, b) => a.name > b.name); break;
            default: return sorted;
        }
        return sort.order === 'desc' ? sorted.reverse() : sorted;
    }

    //MessageHelper.getQueryDetailsForTooltip(query)

    render() {
        const bulkActions = this.props.handleCompareLink
            ? [{ title: 'Delete', onApply: this.deleteQueries.bind(this) },
            { title: 'Compare', onApply: () => this.props.handleCompareLink(this.state.selectedQueries)}]
            : [{ title: 'Delete', onApply: this.deleteQueries.bind(this) }];

        return (
            <div className={IDUtil.cssClassName('project-queries-table')}>
                <div className="tools">
                    <div className="left">
                        <h3>Filters</h3>
                      <div className="filter-container">
                          <input
                            className="search"
                            type="text"
                            placeholder="Search"
                            value={this.state.filter.keywords}
                            onChange={this.keywordsChange.bind(this)}/>
                      </div>
                    </div>
                </div>

                <SortTable
                    items={this.state.queries}
                    head={[
                        { field: 'name', content: 'Name', sortable: true },
                        { field: 'query', content: 'Query', sortable: true },
                        { field: '', content: '', sortable: false },
                        { field: '', content: '', sortable: false }
                    ]}
                    row={query => [
                        {
                            props: { className: 'primary' },
                            content:  <a onClick={this.viewQuery.bind(this, query)}>{query.name}</a>
                        },
                        { content:
                                <div>
                                    <a data-tip data-for={'__qtt__' + query.query.id} data-class="bg__custom-queryTooltip">
                                        <CopyToClipboard textToSave={QueryModel.queryDetailsToClipboard(query)} />
                                    </a>
                                    <ReactTooltip id={'__qtt__' + query.query.id}
                                        getContent={() => MessageHelper.renderQueryForTooltip(query.query)}>
                                    </ReactTooltip>
                                    <span className="bg__searchTerm">{QueryModel.toHumanReadableString(query.query)}</span>
                                </div>
                        },
                        {
                            content: (
                                <a className="btn blank warning" onClick={this.deleteQuery.bind(this, query)}>
                                    Delete
                                </a>
                            )
                        },
                        {
                            content: (
                                <a onClick={this.viewQuery.bind(this, query)} className="btn">
                                    Open
                                </a>
                            )
                        }
                    ]}
                    onSelectQuery={this.onSelectQuery.bind(this)}
                    onSort={this.sortQueries.bind(this)}
                    loading={this.state.loading}
                    bulkActions={bulkActions}
                    defaultSort={{
                        field: 'name',
                        order: 'asc'
                    }}/>
            </div>
        )
    }
}

ProjectQueriesTable.propTypes = {
    // project api
    api: PropTypes.shape({
        list: PropTypes.func.isRequired
    }),

    // current user object used for defining access roles per project
    user: PropTypes.shape({
        id: PropTypes.string.isRequired
    }).isRequired
};


export default ProjectQueriesTable;
