import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import IDUtil from '../../util/IDUtil';
import SortTable from './SortTable';
import { Link } from 'react-router-dom';
import ProjectWrapper from './ProjectWrapper';
import { exportDataAsJSON } from '../helpers/Export';

/**
 * Todo: Project sessions are currently stored on the project object
 * itself. Alternatively they could be stored in the annotation API
 * @Jaap: Decide which approach fits best.
 */


class ProjectSessions extends React.PureComponent {

  constructor(props){
    super(props);

    // Add dummy data
    var exampleUrl = "/tool/exploratory-search?path=/browser/session%3Fid=an-1acf4520-f414-4198-a61f-a91a44fd7408";
    if (!props.project.sessions){
      props.project.sessions = [
        {id: "abcd12349", name: 'Session example: Wereldreis', tool: 'MS: DIVE+', data: {url:exampleUrl}, created: '2017-12-08T18:31:47Z'},
      ];
    }

    this.state={
      sessions: [],
      filter:{
        keywords: '',
        currentUser: false,
      }
    }
  }

 
  /**
   * Keywords filter changes
   * @param {SyntheticEvent} e Event
   */
  keywordsChange(e){
    this.setState({
      filter: Object.assign({}, this.state.filter, {
        keywords: e.target.value
      })
    });
  }

  /**
   * Keywords filter changes
   * @param {SyntheticEvent} e Event
   */
  currentUserChange(e){
    this.setState({
      filter: Object.assign({}, this.state.filter, {
        currentUser: e.target.checked
      })
    });
  }

  /**
   * Filtered the data
   */
  loadData(){
    let result = this.props.project.sessions ? this.props.project.sessions : [];
    let filter = this.state.filter;

    result = this.filterSessions(result, filter);

    // update state
    this.setState({
      sessions: result
    });
  }

    /**
   * Filter session list by given filter
   * @param  {array} sessions   Sessions array
   * @param  {object} filter    Filter object
   * @return {array}            Filtered sessions array
   */
  filterSessions(sessions, filter){
    
    // filter on keywords in name or tool
    if (filter.keywords){
      let keywords = filter.keywords.split(" ");
      keywords.forEach((k)=>{
        k = k.toLowerCase();
        sessions = sessions.filter((session)=>(session.name.toLowerCase().includes(k) || session.tool.toLowerCase().includes(k)))
      });
    }
    
    return sessions;
  }


  /**
   * After mounting, retrieve project data
   */
  componentDidMount(){
    this.loadData();
  }

  /**
   * Listen for update, request new data if filter has been changed
   */
  componentDidUpdate(){
    if (this.lastFilter !== this.state.filter){
      this.lastFilter = this.state.filter;
      this.loadData();
    }
  }

  /**
   * Delete session if confirmed
   * @param {object} session session to delete
   */
  deleteSession(session){
    if (window.confirm('Are you sure you want to delete session ' + session.name)){
      var project = this.props.project;
      
      // delete sessions from project
      project.sessions = project.sessions.filter((s)=>(s != session));

      // store project
      this.props.api.save(this.props.user.id, project, (msg) => {
      if (msg && msg.success){
        // update data 
        this.loadData();      
      } else{
        alert('An error occured while saving this project');
      }      
    });    
      
    }
  }

  /**
   * Delete *multiple* sessions if confirmed
   * @param {object} session session to delete
   */
  deleteSessions(sessions){
    if (window.confirm('Are you sure you want to delete ' + sessions.length + ' sessions?')){
      var project = this.props.project;
      
      // delete sessions from project
      project.sessions = project.sessions.filter((s)=>(!sessions.includes(s)));

      // store project
      this.props.api.save(this.props.user.id, project, (msg) => {
        if (msg && msg.success){
          // update data 
          this.loadData();      
        } else{
          alert('An error occured while saving this project');
        }      
      });
    }
  }

  /**
  * Sort sessions based on sort
  */
  sortSessions(sessions, sort){
   let sorted = sessions;
   switch(sort.field){
    case 'name':
      sorted.sort((a,b) => (a.name > b.name));
    break;
    case 'tool':
      sorted.sort((a,b) => (a.tool > b.tool));
    break;
    case 'date':
      sorted.sort((a,b) => (a.date > b.date));
    break;
    default:
      // no sorting,just return
      return sorted;
   }

   return sort.order === 'desc' ? sorted.reverse() : sorted;
  }

  render() {
    let sessions = this.state.sessions;
    let currentUser = this.props.user;
    let currentUserId = currentUser.id;

    return (
      <div className={IDUtil.cssClassName('project-sessions')}>
        <div className="tools">
          <div className="left">
            <h3>Filters</h3>
            <input className="search"
                   type="text"
                   placeholder="Search"
                   value={this.state.filter.keywords}
                   onChange={this.keywordsChange.bind(this)}
                   />
          </div>
        </div>

        <SortTable
            items={sessions}
            head={[
                {field: 'name', content: 'Name', sortable: true},
                {field: 'tool', content: 'Tool', sortable: true},
                {field: 'date', content: 'Date', sortable: true},
                {field: '', content: '', sortable: false},
                {field: '', content: '', sortable: false},
                {field: '', content: '', sortable: false},
              ]}
            row={(session) =>([
                { props:{className:"primary"}, content: <Link to={session.id}>{session.name}</Link> },
                { content: session.tool},
                { content: session.created.substring(0,10) },
                { content: <a className="btn blank warning" onClick={this.deleteSession.bind(this,session)}>Delete</a>},
                { content: <a className="btn blank" onClick={exportDataAsJSON.bind(this,session)}>Export</a>},
                { content: <a href={session.data.url ? session.data.url : '#no-url-found'} className="btn">Open</a>}
              ])}           

            sort={this.sortSessions.bind(this)}
            loading={this.state.loading}
            bulkActions={[
              {title: 'Delete', onApply: this.deleteSessions.bind(this) },
              {title: 'Export', onApply: exportDataAsJSON.bind(this) }
              ]}
           />
      </div>
    );
  }
}

ProjectSessions.propTypes = {

  // project api
  api: PropTypes.shape({
    list: PropTypes.func.isRequired
  }),

  // current user object used for defining access roles per project
  user: PropTypes.shape({
    id: PropTypes.number.isRequired
  }).isRequired,
}


class WrappedProjectSessions extends React.PureComponent{
  render(){
    return(
      <ProjectWrapper {...this.props} renderComponent={ProjectSessions} />
    )
  }
}

export default WrappedProjectSessions;