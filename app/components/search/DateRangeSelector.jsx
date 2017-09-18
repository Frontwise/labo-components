import IDUtil from '../../util/IDUtil';
import TimeUtil from '../../util/TimeUtil';
import ElasticsearchDataUtil from '../../util/ElasticsearchDataUtil';
import DatePickerSelector from './DatePickerSelector';
//https://facebook.github.io/react/blog/2013/07/11/react-v0-4-prop-validation-and-default-values.html
/*
	Currently based on noUIslider.js

	TODO:
		- create another component based on either:
			https://www.npmjs.com/package/react-bootstrap-date-picker
			https://bootstrap-datepicker.readthedocs.io/en/latest/

	PLAN (9 mrt 2017):
		- first implement it without a date selector
		- then implement a string field selector for the regular search
		- then implement the date field selector here

	component output:
		- a certain date field
		- a certain date range based on years
*/
class DateRangeSelector extends React.Component {

    constructor(props) {
        super(props);
        let dateFields = null;
        if (this.props.collectionConfig) {
            dateFields = this.props.collectionConfig.getDateFields();
        }
        this.state = {
            currentDateField: dateFields && dateFields.length > 0 ? dateFields[0] : null,
            slider: null
        };
    }

    //only update on a new search
    shouldComponentUpdate(nextProps, nextState) {
        return nextProps.searchId != this.props.searchId;
    }

    changeDateField(e) {
        this.onOutput({
            field: e.target.value,
            start: null,
            end: null
        })
    }

    //the data looks like this => {start : '' : end : '', dateField : ''}
    onOutput(data) {
        if (this.props.onOutput) {
            this.props.onOutput(this.constructor.name, data);
        }
    }

    //will propagate the selected dates to the QueryBuilder
    onComponentOutput(componentClass, data) {
        if(componentClass == 'DatePickerSelector') {
            const df = this.props.dateRange.field;
            console.debug('got something back', data);
            if (this.props.aggregations && data) {
                console.debug('there is data');
                if (this.props.aggregations[df]) {
                    console.debug('the field exists in the aggregation');
                    this.onOutput({
                        field: this.props.dateRange.field,
                        start: data.start ? data.start.valueOf() : null,
                        end: data.end ? data.end.valueOf() : null
                    });
                }
            }
        }
    }

    render() {
        let dateFieldSelect = null;

        if (this.props.collectionConfig.getDateFields() && this.props.dateRange) {
            const options = this.props.collectionConfig.getDateFields().map((df, index) => {
                return (<option key={'df__' + index} value={df}>{this.props.collectionConfig.toPrettyFieldName(df)}</option>);
            });
            dateFieldSelect = (
                <select className="form-control" value={this.props.dateRange.field}
                        onChange={this.changeDateField.bind(this)}>
                    {options}
                </select>
            )
        }

        return (
            <div id={'__dps__' + IDUtil.hashCode(this.props.queryId)} className="datePickerSelector">
                <div className={IDUtil.cssClassName('date-range-select')}>
                    <div className="row">
                        <div className="col-md-5">
                            {dateFieldSelect}
                        </div>
                        <DatePickerSelector
                            dateRange={this.props.dateRange}
                            onOutput={this.onComponentOutput.bind(this)}
                        />
                    </div>
                </div>
            </div>
        )
    }
}

export default DateRangeSelector;