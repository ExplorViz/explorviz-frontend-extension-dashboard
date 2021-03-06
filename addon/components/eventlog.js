import Component from '@ember/component';
import layout from '../templates/components/eventlog';
import {
  task,
  timeout
} from 'ember-concurrency';

/*
This is the component for the eventlog widget.
*/
export default Component.extend({


  store: Ember.inject.service(),
  modalservice: Ember.inject.service('modal-content'),

  paused: false,

  //start the initWidget task and resize the widget via html class
  didInsertElement() {
    this._super(...arguments);

    var ctx = document.getElementById(this.elementId);

    ctx.classList.remove("col-xl-4");
    ctx.classList.remove("col-lg-5");
    ctx.classList.add("col-xl-8");

    this.get('initWidget').perform();
  },


  //query for already set settins and start the loop
  initWidget: task(function*() {
    yield this.get('queryEventLogSettings').perform();
    yield this.get('loop').perform();

  }).on('activate').cancelOn('deactivate').drop(),

  //start a loop that query ever 10 seconds for data
  loop: task(function*() {
    while (!this.get('paused')) {
      yield this.get('queryCurrent').perform();
      yield timeout(10000);
    }

  }).on('activate').cancelOn('deactivate').drop(),

  //query for the newest data inside the backend
  queryCurrent: task(function*() {
    const myStore = this.get('store');

    var backendData = yield myStore.query('eventloginfo', {
      entries: this.get('entries')
    });

    this.set('eventloginfo', backendData);

  }).on('activate').cancelOn('deactivate').drop(),

  //query for already set eventlogsettings
  queryEventLogSettings: task(function*() {
    var store = this.get('store');

    yield store.queryRecord('eventlogsetting', {
      instanceID: this.elementId
    }).then(backendData => {
      var entries = backendData.get('entries');
      this.set('entries', entries);
    });
  }).on('activate').cancelOn('deactivate').drop(),

  actions: {
    loadWidgetInfo() {
      this.get('modalservice').setWidget("eventlog");
    },
    eventItemClick() {
      this.set('paused', true);
    },

    //pause the query loop 
    pause() {
      this.set('paused', true);
    },

    //stop the pause and start the query loop again
    resume() {
      this.set('paused', false);
      this.get('loop').perform();
    },

    refresh() {
      this.get('queryCurrent').perform();
    },
    //remove the widget from the dashboard
    remove() {
      var ctx = document.getElementById(this.elementId);
      ctx.style.display = "none";

      const myStore = this.get('store');

      //getting the user id
      var userID = 0;
      let users = myStore.peekAll('user');
      users.forEach((item) => {
        if (item) {
          userID = item.get('id');
        }
      });

      //send post request with timestamp -1 => if timestamp is -1 the entry will be deleted
      let post = myStore.createRecord('instantiatedwidget', {
        userID: userID,
        timestamp: -1,
        widgetName: "",
        instanceID: this.elementId,
        orderID: 0
      });
      post.save();
    },
  },

  layout
});
