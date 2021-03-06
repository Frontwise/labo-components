import IDUtil from '../../../../util/IDUtil';

import { setBreadCrumbsFromMatch } from '../../helpers/BreadCrumbs';

import ProjectTable from './ProjectTable';

import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { initHelp } from '../../helpers/helpDoc';

/**
 * Top level component/page for the projects overview.
 * The data handling is done in the ProjectTable component.
 */
class ProjectListView extends React.PureComponent {

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        setBreadCrumbsFromMatch(this.props.match);

        initHelp('User Projects List', '/feature-doc/howtos/user-projects');
    }

    render() {
        return (
            <div className={IDUtil.cssClassName('project-list-view')}>
                <div className="info-bar">
                    <Link to="/workspace/projects/create" className="btn primary add">
                        Create User Project
                    </Link>
                    <h2>User Projects</h2>
                    <p>Store and share Bookmarks, Annotations, Tool sessions and Queries</p>
                </div>

                <ProjectTable api={this.props.api} user={this.props.user} />
            </div>
        );
    }
}

ProjectListView.propTypes = {
    // project api
    api: PropTypes.shape({
        list: PropTypes.func.isRequired
    }),

    // current user object used for defining access roles per project
    user: PropTypes.shape({
        id: PropTypes.string.isRequired
    }).isRequired
};

export default ProjectListView;
