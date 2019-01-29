/*
Implement the following:
	- https://www.w3.org/2010/05/video/mediaevents.html
	- http://ronallo.com/blog/html5-video-caption-cue-settings-tester/
	- http://www.w3schools.com/tags/ref_av_dom.asp

*/
import PlayerAPI from '../PlayerAPI';
import IDUtil from '../../../util/IDUtil';
import FlexPlayerUtil from '../../../util/FlexPlayerUtil';
import FlexPlayerControls from './FlexPlayerControls';

class HTML5VideoPlayer extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			playerAPI : null
		}
	}

	componentDidMount() {
		const vid = document.getElementById('video-player');
		if(this.props.eventCallbacks) {
			vid.onprogress = this.props.eventCallbacks.loadProgress.bind(this);
			vid.ontimeupdate = this.props.eventCallbacks.playProgress.bind(this);
			vid.onplay = this.props.eventCallbacks.onPlay.bind(this);
			vid.onpause = this.props.eventCallbacks.onPause.bind(this);
			vid.onended = this.props.eventCallbacks.onFinish.bind(this);
			vid.onseeked = this.props.eventCallbacks.onSeek.bind(this);
			vid.onloadedmetadata = this.onReady.bind(this, vid);
		}
		//needed until React will support the controlsList attribute of the video tag
		vid.setAttribute("controlsList","nodownload");
	}

	shouldComponentUpdate(nextProps, nextState) {
		if(nextState.playerAPI != null && this.state.playerAPI == null) { //rerender when the player is ready
			return true
		}
		if(nextProps.mediaObject.assetId == this.props.mediaObject.assetId) { //but only rerender when the media object changed
			return false
		}
		return true
	}

	componentDidUpdate() {
		this.state.playerAPI.getApi().load()
	}

	onReady(playerAPI) {
		if(this.state.playerAPI == null) {
			this.setState(
				{playerAPI : new HTML5VideoPlayerAPI(playerAPI)},
				() => {
					this.onSourceLoaded();
				}
			);
		} else {
			this.onSourceLoaded();
		}
	}

	onSourceLoaded() {
		//then seek to the starting point
		//TODO hmm should this start be realitve to the resourceStart? :s :s :s
		const start = this.props.mediaObject.start ? this.props.mediaObject.start : 0;
		if(start > 0) {
			this.state.playerAPI.seek(start / 1000);
		}

		//skip to the on-air content
		if(typeof(this.props.mediaObject.resourceStart) == "number" && this.props.mediaObject.resourceStart > 0) {
			this.state.playerAPI.seek(this.props.mediaObject.resourceStart);
		}

		//notify the owner
		if(this.props.onPlayerReady) {
			this.props.onPlayerReady(this.state.playerAPI);
		}
	}

	render() {
		let controls = null;
		if(this.state.playerAPI) {
			controls = (
				<FlexPlayerControls
					api={this.state.playerAPI}
					mediaObject={this.props.mediaObject}
					duration={FlexPlayerUtil.onAirDuration(this.state.playerAPI.getApi().duration, this.props.mediaObject)}
				/>
			)
		}
		return (
			<div>
				<video
					id="video-player"
					width="100%"
					muted
					className={IDUtil.cssClassName('html5-video-player')}
					controls
					controlsList="nodownload"
					crossOrigin={
						this.props.useCredentials ? "use-credentials" : null
				}>
					<source src={this.props.mediaObject.url}></source>
					Your browser does not support the video tag
				</video>
				{controls}
			</div>
		)
	}

}

class HTML5VideoPlayerAPI extends PlayerAPI {

	constructor(playerAPI) {
		super(playerAPI);
	}

	/* ------------ Implemented API calls ------------- */

	play() {
		this.playerAPI.play();
	}

	pause() {
		this.playerAPI.pause();
	}

	seek(secs) {
		if(secs != isNaN) {
			this.playerAPI.currentTime = secs;
		}
	}

	getPosition(callback) {
		callback(this.playerAPI.currentTime);
	}

	getDuration(callback) {
		callback(this.playerAPI.duration);
	}

	isPaused(callback) {
		callback(this.playerAPI.paused);
	}

	/* ----------------------- non-essential player specific calls ----------------------- */

	//TODO
}

export default HTML5VideoPlayer;