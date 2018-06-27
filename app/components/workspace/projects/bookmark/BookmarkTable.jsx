import AnnotationAPI from '../../../../api/AnnotationAPI';
import ProjectAPI from '../../../../api/ProjectAPI';

import IDUtil from '../../../../util/IDUtil';
import ComponentUtil from '../../../../util/ComponentUtil';
import BookmarkUtil from '../../../../util/BookmarkUtil';
import AnnotationUtil from '../../../../util/AnnotationUtil';

import AnnotationStore from '../../../../flux/AnnotationStore';

import { exportDataAsJSON } from '../../helpers/Export';
import BulkActions from '../../helpers/BulkActions';
import {
    createAnnotationOptionList,
    createOptionList,
    createClassificationOptionList,
    createSimpleArrayOptionList
} from '../../helpers/OptionList';

import ResourceViewerModal from '../../ResourceViewerModal';

import BookmarkRow from './BookmarkRow';
import NestedTable from '../../helpers/NestedTable';
import classNames from 'classnames';
import PropTypes from 'prop-types';

/**
* This view handles the loading, filtering and selection of data of
* the Bookmarks list of a project. It is displayed using the NestedTable component.
*/
class BookmarkTable extends React.PureComponent {

    constructor(props) {
        super(props);

        this.orders = [
            { value: 'created', name: 'Bookmark created' },
            { value: 'newest', name: 'Newest objects first' },
            { value: 'oldest', name: 'Oldest objects first' },
            { value: 'name-az', name: 'Title A-Z' },
            { value: 'name-za', name: 'Title Z-A' },
            { value: 'mediatype', name: 'Media' },
            { value: 'dataset', name: 'Dataset' },
            { value: 'group', name: 'Groups' },
        ];

        this.bulkActions = [
            { title: 'Delete', onApply: this.deleteBookmarks.bind(this) },
            { title: 'Export', onApply: this.exportBookmarks.bind(this) }
        ];

        this.state = {
            annotations: [],
            bookmarks: [],
            selection: [],
            subMediaObject: {},
            subSegment: {},
            loading: true,
            detailBookmark: null,
            filters: []
        };

        // bind functions (TODO get rid of these, unnecessary and confusing)
        this.viewBookmark = this.viewBookmark.bind(this);
        this.deleteBookmarks = this.deleteBookmarks.bind(this);
        this.deleteBookmark = this.deleteBookmark.bind(this);

        this.filterBookmarks = this.filterBookmarks.bind(this);
        this.sortBookmarks = this.sortBookmarks.bind(this);
        this.renderResults = this.renderResults.bind(this);

        this.selectAllChange = this.selectAllChange.bind(this);
        this.selectItem = this.selectItem.bind(this);
        this.closeItemDetails = this.closeItemDetails.bind(this);
        this.toggleSubMediaObject = this.toggleSubMediaObject.bind(this);
        this.toggleSubSegment = this.toggleSubSegment.bind(this);
        this.unFoldAll = this.unFoldAll.bind(this);
        this.foldAll = this.foldAll.bind(this);
    }

    componentWillMount() {
        this.loadBookmarks();
    }

    loadBookmarks() {
        this.setState({
            loading:true
        });

        AnnotationStore.getUserProjectAnnotations(
            this.props.user,
            this.props.project,
            this.onLoadBookmarks.bind(this)
        );
    }
    //Annotation load callback: set data to state
    onLoadBookmarks(data) {

        // create bookmark lists
        if (data && data.annotations && data.annotations.length){
            // store annotation data
            this.setState({annotations:data.annotations});
            AnnotationUtil.generateBookmarkCentricList(
                data.annotations,
                this.onLoadResourceList.bind(this)
            );
        } else{
            this.setState({
                annotations: [],
                bookmarks: [],
                selection: [],
                filters: this.getFilters([])
            });
        }
    }
    //The resource list now also contains the data of the resources
    onLoadResourceList(bookmarks) {
        this.setState({
            bookmarks: bookmarks,
            loading: false,
            filters: this.getFilters(bookmarks)
        });

        this.updateSelection(bookmarks);
    }

    //Get filter object
    getFilters(items) {
        return [
            // search filter
            {
                title:'',
                key: 'keywords',
                type: 'search',
                placeholder: 'Search Bookmarks'
            },

            // type filter
            {
                title:'Media',
                key: 'mediaType',
                type: 'select',
                options: createSimpleArrayOptionList(items, (i)=>(i.object.mediaTypes) )
            },
            // group filter
            {
                title:'☆ Group',
                key: 'group',
                type: 'select',
                titleAttr: 'Bookmark group',
                options: createClassificationOptionList(items,'groups')
            },
            // annotations filter
            {
                title:'Annotations',
                key: 'annotations',
                type: 'select',
                titleAttr: 'MediaObject annotations',
                options: [
                    {value:'yes',name:'With annotations'},
                    {value:'no',name:'Without annotations'},
                    {value:'',name:'-----------', disabled: true}
                ].concat(createAnnotationOptionList(items)),
            },
            // segment filter
            {
                title:'Fragments',
                key: 'segments',
                type: 'select',
                options: [
                    {value:'yes',name:'With fragments'},
                    {value:'no',name:'Without fragments'},
                ],
            },

        ];
    }



    //Update Selection list, based on available items
    updateSelection(items) {
        this.setState({
            selection: items.map(item => item.resourceId).filter(
                itemId => this.state.selection.includes(itemId)
            )
        });
    }

    filterBookmarks(bookmarks, filter) {
        // filter on type
        if (filter.mediaType) {
            bookmarks = bookmarks.filter(bookmark =>
                bookmark.object.mediaTypes.includes(filter.mediaType)
            );
        }

        // filter on group
        if (filter.group) {
            bookmarks = bookmarks.filter(bookmark =>
                bookmark.groups.some((g) => (g.annotationId == filter.group))
            );
        }

        // filter on annotations
        if (filter.annotations) {
            switch(filter.annotations){
                case 'yes':
                    bookmarks = bookmarks.filter(bookmark =>
                        bookmark.annotations.length > 0
                    );
                break;
                case 'no':
                    bookmarks = bookmarks.filter(bookmark =>
                        bookmark.annotations.length === 0
                    );
                break;
                default:
                    bookmarks = bookmarks.filter(bookmark =>
                        bookmark.annotations.some((a) => (a.annotationType === filter.annotations))
                    );
            }
        }

        // filter on segments
        if (filter.segments) {
            switch(filter.segments){
                case 'yes':
                    bookmarks = bookmarks.filter(bookmark =>
                        bookmark.segments.length > 0
                    );
                break;
                case 'no':
                    bookmarks = bookmarks.filter(bookmark =>
                        bookmark.segments.length === 0
                    );
                break;
            }
        }

        // filter on keywords in title, dataset or type
        if (filter.keywords) {
            const keywords = filter.keywords.split(' ');
            keywords.forEach(k => {
                k = k.toLowerCase();
                bookmarks = bookmarks.filter(
                    bookmark =>
                    // object
                    (bookmark.object && Object.keys(bookmark.object).some((key)=>(
                        typeof bookmark.object[key] == 'string' && bookmark.object[key].toLowerCase().includes(k))
                        ))
                    ||
                    // annotations
                    (bookmark.annotations && bookmark.annotations.some((annotation)=>(
                        Object.keys(annotation).some((key)=>(typeof annotation[key] == 'string' && annotation[key].toLowerCase().includes(k)))
                        )))
                );
            });
        }



        return bookmarks;
    }

    sortBookmarks(bookmarks, field) {
        const getFirst = (a, empty)=>(
            a.length > 0 ? a[0] : empty
            );

        const sorted = bookmarks;
        switch (field) {
            case 'created':
                sorted.sort((a, b) => a.created > b.created ? 1 : -1);
                break;
            case 'newest':
                sorted.sort((a, b) => a.object.date < b.object.date ? 1 : -1);
                break;
            case 'oldest':
                sorted.sort((a, b) => a.object.date > b.object.date ? 1 : -1);
                break;
            case 'name-az':
                sorted.sort((a, b) => a.object.title > b.object.title ? 1 : -1);
                break;
            case 'name-za':
                sorted.sort((a, b) => a.object.title < b.object.title ? 1 : -1);
                break;
            case 'mediatype':{
                    // '~' > move empty to bottom
                    const e = '~';
                    sorted.sort((a, b) => getFirst(a.object.mediaTypes, e) > getFirst(b.object.mediaTypes, e) ? 1 : -1);
                    break;
                }
            case 'dataset':
                sorted.sort((a, b) => a.object.dataset > b.object.dataset ? 1 : -1);
                break;
            case 'group':{
                    // '~' > move empty to bottom
                    const e = {label:'~'};
                    sorted.sort((a, b) => getFirst(a.groups, e).label > getFirst(b.groups, e).label  ? 1 : -1);
                    break;
                }
            default: return sorted;
        }

        return sorted;
    }

    //delete multiple bookmarks
    deleteBookmarks(bookmarkIds) {
        if(bookmarkIds) {
            if (!confirm('Are you sure you want to remove the selected bookmarks and all its annotations?')) {
                return;
            }

            // delete each bookmark
            BookmarkUtil.deleteBookmarks(
                this.state.annotations,
                this.state.bookmarks,
                bookmarkIds,
                (success) => {
                    // add a time out, because sometimes it may take a while for
                    // the changes to be reflected in the data
                    setTimeout(()=>{
                            // load new data
                            this.loadBookmarks();

                            // update bookmark count in project menu
                            this.props.loadBookmarkCount();
                        }
                        , 500);
                }
            )
        }
    }

    exportBookmarks(selection) {
        const data = this.state.bookmarks.filter(item =>
            selection.includes(item.resourceId)
            );
        exportDataAsJSON(data);
    }

    deleteBookmark(bookmark){
        this.deleteBookmarks([bookmark.resourceId]);
    }

    makeActiveProject() {
        ComponentUtil.storeJSONInLocalStorage('activeProject', this.props.project);
    }

    viewBookmark(bookmark) {
        // make current project active
        if (bookmark) {
            this.makeActiveProject();
        }
        this.setState({
            detailBookmark: bookmark
        });
    }

    selectAllChange(items, e) {
        if (e.target.checked) {
            const newSelection = this.state.selection.slice();
            items.forEach(item => {
                if (!newSelection.includes(item.resourceId)) {
                    newSelection.push(item.resourceId);
                }
            });
            // set
            this.setState({
                selection: newSelection
            });
        } else {
            items = items.map(item => item.resourceId);
            // unset
            this.setState({
                selection: this.state.selection.filter(item => !items.includes(item))
            });
        }
    }

    selectItem(item, select) {
        if (select) {
            if (!this.state.selection.includes(item.resourceId)) {
                // add to selection
                this.setState({
                    selection: [...this.state.selection, item.resourceId]
                });
            }
            return;
        }

        // remove from selection
        if (!select) {
            this.setState({
                selection: this.state.selection.filter(selected => selected !== item.resourceId)
            });
        }
    }

    //Close itemDetails view, and refresh the data (assuming changes have been made)
    closeItemDetails() {
        // set viewbookmark to null
        this.viewBookmark(null);

        // update bookmark count in project menu
        this.props.loadBookmarkCount();

        // refresh data
        this.loadBookmarks();
    }

    // Toggle sublevel mediaobject visibility
    toggleSubMediaObject(id){
        const subMediaObject = Object.assign({}, this.state.subMediaObject);
        if (id in subMediaObject){
            delete subMediaObject[id];
        } else{
            subMediaObject[id] = true;
        }
        // remove from subSegments
        const subSegment = Object.assign({},this.state.subSegment);
        delete subSegment[id];

        this.setState({subMediaObject, subSegment});
    }

    // Toggle sublevel segment visibility
    toggleSubSegment(id){
        const subSegment = Object.assign({}, this.state.subSegment);
        if (id in subSegment){
            delete subSegment[id];
        } else{
            subSegment[id] = true;
        }
        // remove from subMediaObject
        const subMediaObject = Object.assign({},this.state.subMediaObject);
        delete subMediaObject[id];

        this.setState({subMediaObject, subSegment});
    }

    unFoldAll(){
        const showSub = {};
        switch(this.foldTarget.value){
            case 'mediaobject':
                this.state.bookmarks.forEach((b)=>{
                    if (b.annotations && b.annotations.length > 0){
                        showSub[b.resourceId] = true;
                    }
                });
                this.setState({subSegment:{}, subMediaObject: showSub});
            break;
            case 'segments':
                this.state.bookmarks.forEach((b)=>{
                    if (b.segments && b.segments.length > 0){
                        showSub[b.resourceId] = true;
                    }
                });
                this.setState({subMediaObject:{}, subSegment: showSub});
            break;
        }
    }

    foldAll(){
        switch(this.foldTarget.value){
            case 'mediaobject':
                    this.setState({subMediaObject:{}});
            break;
            case 'segments':
                    this.setState({subSegment:{}});
            break;
        }
    }

    renderResults(renderState) {
        const annotationTypeFilter = renderState.filter.annotations && !['yes','no'].includes(renderState.filter.annotations) ?
            renderState.filter.annotations : '';
        return (
            <div>
                <h2>
                    <input
                        type="checkbox"
                        checked={
                            renderState.visibleItems.length > 0 && renderState.visibleItems.every(item =>
                                this.state.selection.includes(item.resourceId)
                            )
                        }
                        onChange={this.selectAllChange.bind(this, renderState.visibleItems)}/>

                    Bookmarks:{' '}
                    <span className="count">{renderState.visibleItems.length || 0}</span>

                    <div className="fold">
                        <div className="filter">
                            <span onClick={this.unFoldAll}>Show all</span>&nbsp;/&nbsp;<span onClick={this.foldAll}>Hide all</span>
                        </div>
                        <select ref={elem => (this.foldTarget = elem)}>
                            <option value="mediaobject">MediaObject annotations</option>
                            <option value="segments">Segments</option>
                        </select>

                    </div>
                </h2>

                <div className="bookmark-table">
                    {renderState.visibleItems.length ?
                        renderState.visibleItems.map((bookmark, index) => (
                        <BookmarkRow
                            key={bookmark.resourceId}
                            bookmark={bookmark}
                            onDelete={this.deleteBookmark}
                            onExport={exportDataAsJSON}
                            onView={this.viewBookmark}
                            selected={this.state.selection.includes(bookmark.resourceId)}
                            onSelect={this.selectItem}
                            showSubMediaObject={bookmark.resourceId in this.state.subMediaObject}
                            showSubSegment={bookmark.resourceId in this.state.subSegment}
                            toggleSubMediaObject={this.toggleSubMediaObject}
                            toggleSubSegment={this.toggleSubSegment}
                            annotationTypeFilter={annotationTypeFilter}
                            projectId={this.props.project.id}
                            />
                    ))
                    : <h3>∅ No results</h3>
                }
                </div>
            </div>
        )
    }

    render() {
        let detailsModal = null;
        if(this.state.detailBookmark) {
            detailsModal = (
                <ResourceViewerModal
                    bookmark={this.state.detailBookmark}
                    onClose={this.closeItemDetails}/>
            )
        }
        return (
            <div className={classNames(IDUtil.cssClassName('bookmark-table'),{loading:this.state.loading})}>
                <NestedTable
                    uid={this.props.project.id + "-bookmarks"}

                    filterItems={this.filterBookmarks}
                    renderResults={this.renderResults}
                    onExport={exportDataAsJSON}

                    items={this.state.bookmarks}
                    sortItems={this.sortBookmarks}
                    selection={this.state.selection}
                    orders={this.orders}
                    filters={this.state.filters}

                    toggleSubMediaObject={this.state.subMediaObject}
                    toggleSubSegment={this.state.subSegment}
                    />

                <BulkActions
                    bulkActions={this.bulkActions}
                    selection={this.state.selection}/>

                {detailsModal}
            </div>
        )
    }

}

BookmarkTable.propTypes = {
    user: PropTypes.object.isRequired,
    project: PropTypes.object.isRequired,
    loadBookmarkCount: PropTypes.func.isRequired,
};

export default BookmarkTable;