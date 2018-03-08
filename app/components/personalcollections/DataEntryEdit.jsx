import IDUtil from '../../util/IDUtil';
import PersonalCollectionAPI from '../../api/PersonalCollectionAPI';
import DataEntryForm from './DataEntryForm';
import PropTypes from 'prop-types';
import { setBreadCrumbsFromMatch } from '../helpers/BreadCrumbs';


/**
 * Edit the data entry as specified by the router, using the DataEntryForm component
 */
class DataEntryEdit extends React.PureComponent {
  /**
   * Construct this component
   */
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      dataEntry: null,
    };
  }
      
  /**
   * React lifecycle event
   */
  componentDidMount() {
    // get collection & entry id from url
    const collectionId = this.props.match.params.cid;
    const entryId = this.props.match.params.did;
    
    // load entry data, and set state
    PersonalCollectionAPI.getEntry(this.props.user.id, collectionId, entryId, dataEntry => {
      // inject project name to breadcrumbs
      const titles = {};
      titles[dataEntry.id] = dataEntry.title;
      // update breadcrumbs
      setBreadCrumbsFromMatch(this.props.match, titles);
      
      this.setState({
        loading: false,
        dataEntry: dataEntry
      });
    });
  }

  /**
   * React render function
   *
   * @return {Element}
   */
  render() {    
            
    return (
      <div className={IDUtil.cssClassName('project-edit')}>
        <div className="info-bar">
          <h2>Edit Data Entry</h2>
          <p>
            A data entry contains metadata and possibly a link to an external data source
          </p>
        </div>
        
        {this.state.loading ? (
          <h3 className="loading">Loading...</h3>
        ) : this.state.dataEntry ? (
          <DataEntryForm
            submitButton="Save Entry"
            cancelLink={
              '/workspace/collections/'+this.props.match.params.cid+'/edit' 
            }
            dataEntry={this.state.dataEntry}
            dataEntryDidSave={collectionId => {
              // navigate to new collection page
              this.props.history.push(
                '/workspace/collections/'+collectionId+'/edit'
              );
            }}
            collectionId = {this.props.match.params.cid}
            user={this.props.user}
            api={this.props.api}
          />
        ) : (
          <h3 className="error">Data Entry could not be found</h3>
        )}      
      </div>
    );
  }
}

DataEntryEdit.propTypes = {
  api: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired
};

export default DataEntryEdit;