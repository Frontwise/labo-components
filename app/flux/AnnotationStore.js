import MicroEvent from 'microevent';
import AnnotationAPI from '../api/AnnotationAPI';
import AppDispatcher from './AppDispatcher';
import AnnotationUtil from '../util//AnnotationUtil';

//See: https://github.com/jeromeetienne/microevent.js


class AnnotationStore {

	/* --------------- FOR FETCHING ANNOTATIONS ------------------- */

	//Note: the source of the annotation is always set to the assetId (i.e. media object ID)
	getMediaObjectAnnotations(assetId, user, project, callback, offset = 0, size = 250, sort = null, dateRange = null) {
		const notFilter = {
			'motivation' : 'bookmarking'
		}
		const filter = {
			'target.source' : assetId,
			'user.keyword' : user.id
		}
		if(project && project.id) {
			filter['project'] = project.id
		}
		AnnotationAPI.getFilteredAnnotations(user.id, filter, notFilter, callback, offset, size, sort, dateRange);
	}

	//TODO get rid of this function
	getUserProjectBookmarks(userId, projectId, callback) {
		AnnotationAPI.getBookmarks(userId, projectId, callback);
	}

	/* --------------- FOR TRIGGERS LISTENERS ------------------- */

	changeTarget(annotationTarget) {
		this.trigger('change-target', annotationTarget);
		if(annotationTarget) {
			this.trigger(annotationTarget.source, 'change-target', null, null);
		}
	}

	changeProject(project) {
		this.trigger('change-project', project);
	}

	//TODO change the name of the event 'change' --> save-annotation
	save(annotation) {
		AnnotationAPI.saveAnnotation(annotation, (data) => {
			//assign the newly saved ID to the annotation
			if(data.id) {
				annotation.id = data.id;
			}
			//notify all components that just listen to a single target (e.g. FlexPlayer, FlexImageViewer)
			this.trigger(annotation.target.source, 'update', data, annotation);
			//then notify all components that are interested in all annotations
			this.trigger('save-annotation', data, annotation);
		});
	}

	delete(annotation) {
		AnnotationAPI.deleteAnnotation(annotation, (data, annotation) => {
			//notify all components that just listen to a single target (e.g. FlexPlayer, FlexImageViewer)
			this.trigger(annotation.target.source, 'delete', data, annotation);
			//then notify all components that are interested in all annotations
			this.trigger('del-annotation', data, annotation);
		});
	}

	edit(annotation, subAnnotation) {
		this.trigger('edit-annotation', annotation, subAnnotation);
	}

	set(annotation) {
		this.trigger('set-annotation', annotation);
		if(annotation) {
			this.trigger(annotation.target.source, 'set', null, annotation);
		}
	}

	play(annotation) {
		this.trigger('play-annotation', annotation);
		if(annotation) {
			this.trigger(annotation.target.source, 'play', null, annotation);
		}
	}

}

const AppAnnotationStore = new AnnotationStore();

//add support for emitting events
MicroEvent.mixin(AnnotationStore);

AppDispatcher.register( function( action ) {

    switch(action.eventName) {

        case 'save-annotation':
            AppAnnotationStore.save(action.annotation);
            break;
        case 'delete-annotation':
            AppAnnotationStore.delete(action.annotation);
            break;
        case 'edit-annotation':
            AppAnnotationStore.edit(action.annotation, action.subAnnotation);
            break;
        case 'set-annotation':
            AppAnnotationStore.set(action.annotation);
            break;
        case 'play-annotation':
            AppAnnotationStore.play(action.annotation);
            break;
        case 'change-target':
            AppAnnotationStore.changeTarget(action.annotationTarget);
            break;
		case 'change-project':
			AppAnnotationStore.changeProject(action.project);
			break;

    }

});

export default AppAnnotationStore;