import IDUtil from '../../util/IDUtil';
import ComponentUtil from '../../util/ComponentUtil';
import {LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Label, ResponsiveContainer, BarChart, Legend, Bar} from 'recharts';
import TimeUtil from '../../util/TimeUtil';
import SearchAPI from '../../api/SearchAPI';
import PropTypes from 'prop-types';

//TODO visualise the out of range dates somehow
//TODO move same functions as in Histogram into something else
//TODO add PropTypes
class QuerySingleLineChart extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            viewMode: 'absolute', // Sets default view mode to absolute.
            relativeData : null, //loaded for the first time after switching to 'relative'
            isSearching: false
        }
    }

    calcDateInRange = aggregation => {
        let startMillis = null;
        let endMillis = null;
        if(this.props.query.dateRange) {
            startMillis = this.props.query.dateRange.start
            endMillis = this.props.query.dateRange.end
        }
        if ((startMillis != null && aggregation.date_millis < startMillis) ||
            endMillis != null && aggregation.date_millis > endMillis) {
            return false;
        }
        return true;
    };

    toggleDisplayMode = () => {
        if (this.state.viewMode === 'relative') {
            this.setState({viewMode: 'absolute'});
        } else {
            if(this.state.relativeData === null) {
                this.fetchRelativeData({
                    ...this.props.query,
                    term: '',
                    selectedFacets: {},
                    dateRange: {
                        ...this.props.query.dateRange,
                        end:null,
                        start:null
                    }
                });
            } else {
                this.setState({viewMode: 'relative'});
            }
        }
    };

    fetchRelativeData(query, updateUrl = false) {
        this.setState({
            isSearching : true
        }, () => {
            SearchAPI.search(
                query,
                this.props.collectionConfig,
                this.onRelativeDataFetched,
                updateUrl
            );
        });
    }

    onRelativeDataFetched = data => {
        if (data && data.aggregations && !data.error) {
            const totalDateRangeCounts = data.aggregations[data.query.dateRange.field];
            const commonData = totalDateRangeCounts.filter(aggr => {
                return this.props.data.find(absAggr => absAggr.key === aggr.key) != null;
            });
            this.setState({isSearching: false, relativeData: commonData, viewMode: 'relative'});
        }
    };

    calcRelativePercentage = (absCount, totalCount) => {
        return absCount !== 0 && totalCount !== 0 ? ((absCount / totalCount) * 100) : 0;
    };

    //TODO better ID!! (include some unique part based on the query)
    render() {
        const strokeColors = ['#8884d8', 'green'];
        let dataPrettyfied = null;
        if(this.props.data) {
            if(this.state.viewMode === 'absolute') {
                dataPrettyfied = this.props.data.map((absData, i) => {
                    const point = {};
                    point["dataType"] = 'absolute';
                    point["strokeColor"] = strokeColors[0]; //this.calcDateInRange(absData) ? strokeColors[0] : strokeColors[1];
                    point["date"] = TimeUtil.getYearFromDate(absData.date_millis);
                    point["count"] = absData ? absData.doc_count : 0;
                    return point;
                });
            } else if(this.state.relativeData) {
                dataPrettyfied = this.props.data.map((absData, i) => {
                    const relData = this.state.relativeData.find(x => x.key === absData.key);
                    const point = {};
                    point["dataType"] = 'relative';
                    point["strokeColor"] = strokeColors[0]; //this.calcDateInRange(absData) ? strokeColors[0] : strokeColors[1];
                    point["date"] = TimeUtil.getYearFromDate(absData.date_millis);
                    point["count"] = relData ? this.calcRelativePercentage(absData.doc_count, relData.doc_count) : 0; //FIXME this should never happen, but still...
                    return point;
                });
            } else {
                console.error('this should never happen')
            }
        }

        if(dataPrettyfied) {
            const hitsOutsideRange = this.props.data.filter(aggr => !this.calcDateInRange(aggr)).reduce((acc, cur) => acc += cur.doc_count, 0);
            const totalHits = this.props.data.reduce((acc, cur) => acc += cur.doc_count, 0);
            let legendTitle = 'Timeline chart of query results ';
            if(hitsOutsideRange > 0) {
                legendTitle += '(' + ComponentUtil.formatNumber(hitsOutsideRange) + " / " + ComponentUtil.formatNumber(totalHits) + ' hits out of range)';
            }
            const prettySelectedFieldName = this.props.collectionConfig.toPrettyFieldName(this.props.query.dateRange.field);
            return (
                <div className={IDUtil.cssClassName('query-line-chart')}>
                    <span className="ms_toggle_btn" >
                        <input id="toggle-1" className="checkbox-toggle checkbox-toggle-round" type="checkbox" onClick={this.toggleDisplayMode}/>
                        <label htmlFor="toggle-1" data-on="Relative" data-off="Absolute"/>
                    </span>
                    <ResponsiveContainer width="100%" minHeight="360px" height="40%">
                        <LineChart  key={this.state.viewMode}  width={600} height={300} data={dataPrettyfied} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                            <Legend verticalAlign="top" height={36}/>
                            <CartesianGrid strokeDasharray="1 6"/>
                            <XAxis dataKey="date" height={100}>
                                <Label value={prettySelectedFieldName} offset={0} position="outside"
                                       style={{fontSize: 1.4 + 'rem', fontWeight:'bold'}}/>
                            </XAxis>
                            <YAxis tickFormatter={ComponentUtil.formatNumber} width={100} >
                                <Label value="Number of records" offset={10} position="insideBottomLeft" angle={-90}
                                       style={{fontSize: 1.4 + 'rem', fontWeight:'bold', height: 460 + 'px', width: 100 + 'px' }}/>
                            </YAxis>
                            <Tooltip content={<CustomTooltip/>}/>
                            <Line isAnimationActive={true} dataKey="count"
                                  stroke={dataPrettyfied[0].strokeColor} activeDot={{r: 8}} name={legendTitle}/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )
        } else {
            return (
                <div className={IDUtil.cssClassName('query-line-chart')}>
                    Loading data...
                </div>
            )
        }
    }
}

// Custom tooltip.
// TODO: Make it a separated component more customizable.
class CustomTooltip extends React.Component{
    render() {
        const {active} = this.props;
        if (active) {
            const {payload, label} = this.props,
                relativeValue = payload[0].value ? parseFloat(payload[0].value.toFixed(2)) : 0,
                dataType = payload[0].payload.dataType;
            if (dataType === 'relative') {
                return (
                    <div className="ms__custom-tooltip">
                        <h4>{dataType} value</h4>
                        <p>Year: <span className="rightAlign">{`${label}`}</span></p>
                        <p>Percentage: <span className="rightAlign">{ComponentUtil.formatNumber(relativeValue)}%</span></p>
                    </div>
                );
            } else {
                return (
                    <div className="ms__custom-tooltip">
                        <h4>{dataType} value</h4>
                        <p>Year: <span className="rightAlign">{`${label}`}</span> </p>
                        <p>Total: <span className="rightAlign">{ComponentUtil.formatNumber(payload[0].value)}</span></p>
                    </div>
                );
            }

        }

        return null;
    }
}
CustomTooltip.propTypes = {
    dataType: PropTypes.string,
    payload: PropTypes.array,
    label: PropTypes.number
};
export default QuerySingleLineChart;
