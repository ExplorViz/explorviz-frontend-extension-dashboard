import DS from 'ember-data';
const {
  Model
} = DS;

/*
This is the model for the ram and cpu settings. It has the same properties like the model
in the backend. This model is needed for ember, that ember can automatically parse the json into a
readable model.
*/
export default Model.extend({
  nodeName: DS.attr('string'),
  instanceID: DS.attr('number')
});
