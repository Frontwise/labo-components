import IDUtil from '../../util/IDUtil';
import ProjectForm from './ProjectForm';
import PropTypes from 'prop-types';
import { setBreadCrumbsFromMatch } from '../helpers/BreadCrumbs';

/**
 * Create a new project, using the ProjectForm component
 */
class ProjectCreate extends React.PureComponent {
  /**
   * React lifecycle event
   */
  componentDidMount() {
    setBreadCrumbsFromMatch(this.props.match);
  }

  /**
   * React render function
   *
   * @return {Element}
   */
  render() {
    return (
      <div className={IDUtil.cssClassName('project-create')}>
        <div className="info-bar">
          <h2>Create User Project</h2>
          <p>
            A user project contains Bookmarks & Annotations and Tool Sessions
          </p>
        </div>

        <ProjectForm
          submitButton="create"
          cancelLink="/workspace/projects"
          project={{
            name: '',
            description: '',
            isPrivate: false,
            user: this.props.user.id
          }}
          projectDidSave={projectId => {
            // navigate to new project page
            this.props.history.push(
              '/workspace/projects/' + encodeURIComponent(projectId)
            );
          }}
          user={this.props.user}
          api={this.props.api}
        />
      </div>
    );
  }
}

ProjectCreate.propTypes = {
  api: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired
};

export default ProjectCreate;
