import Component from '@ember/component';
import layout from '../templates/components/aggregatedresponsetime-pie';
import {
  task,
  timeout
} from 'ember-concurrency';
import color from '../utils/color';

export default Component.extend({
  store: Ember.inject.service(),
  modalservice: Ember.inject.service('modal-content'),

  didInsertElement() {
    this._super(...arguments);
    this.get('initWidget').perform();
  },

  initWidget: task(function*() {


    yield this.get('createChart').perform();
    yield this.get('queryData').perform();
    this.get('queryDataLoop').perform();

  }).on('activate').cancelOn('deactivate').drop(),

  queryDataLoop: task(function*() {
    while (true) {
      yield timeout(10000); // wait 10 seconds
      yield this.get('queryData').perform();
    }
  }).on('activate').cancelOn('deactivate').restartable(),

  queryData: task(function*() {
    const myStore = this.get('store');

    myStore.query('aggregatedresponsetime', {
      limit: 5,
      timestampLandscape: 0,
    }).then(backendData => {


      var labels = [];
      var data = [];

      if (backendData.length == 0) {
        this.set('timestampLandscape', -1);
      }

      backendData.forEach(element => {

        var source = element.get('sourceClazzFullName');
        var temp = source.split(".");
        var sourceClazz = temp[temp.length-1];


        var target = element.get('targetClazzFullName');
        temp = target.split(".");
        var targetClazz = temp[temp.length-1];

        var displayName = "Source Clazz: " +sourceClazz + "#Target Clazz: " + targetClazz + "#Total Requests: " + element.get('totalRequests');

        labels.push(displayName);

        data.push(element.get('averageResponseTime'));
        this.set('timestampLandscape', element.get('timestampLandscape'));
      });

      var chart = this.get('chart');

      if (chart != null) {

        if (labels.length == 0 && data.length == 0) {

          labels = ['no operation in the latest landscape'];
          data = [1];
        }

        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.data.datasets[0].backgroundColor = color(data.length);
        chart.update();
      }

    });
  }).on('activate').cancelOn('deactivate').drop(),

  createChart: task(function*() {
    Chart.defaults.global.defaultFontFamily = 'Nunito', '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

    var myPieChart = document.getElementById('aggregatedresponsetimeCanvas_' + this.elementId);
    var chart = new Chart(myPieChart, {
      type: 'outlabeledPie',
      data: {
        labels: ['no landscape available'],
        datasets: [{
          data: [1],
          backgroundColor: color(1),
        }],
      },
      plugins: [ChartDataLabels],
      options: {
        maintainAspectRatio: false,
        aspectRatio: 1,
        tooltips: {
          backgroundColor: "rgb(255,255,255)",
          bodyFontColor: "#000000",
          borderColor: '#dddfeb',
          borderWidth: 1,
          xPadding: 15,
          yPadding: 15,
          displayColors: false,
          caretPadding: 10,

          callbacks: {
            label: function(tooltipItem, data) {
              var indice = tooltipItem.index;
              var result = [];
              var label = data.labels[indice];
              var temp = label.split("#");
              //result.push('Source/Target Clazz: ' + data.labels[indice]);
              temp.push('Average response time: ' + displayNumber(data.datasets[0].data[indice]));

              return temp;
            }
          }

        },
        legend: {
          display: false,
          fontColor: "#000000",
        },
        cutoutPercentage: 0,

        plugins: {
          labels: false,
          datalabels: false,
          outlabels: {
            text: function(context) {
              var index = context.dataIndex;
              var value = context.dataset.data[index];
              var label = context.labels[index];

              return displayNumber(value);
            },
            color: 'black',
            stretch: 15,
            font: {
              resizable: true,
              minSize: 12,
              maxSize: 18
            }
          }
        }


      },
    });
    this.set('chart', chart);

  }).on('activate').cancelOn('deactivate').drop(),

  actions: {
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

function displayNumber(num) {
  var len = num.toString().length;

  //seconds
  if (len >= 10) {
    num = num / 1000000000;
    return num.toFixed(2) + "s";
  }

  //milliseconds
  if (len >= 7) {
    num = num / 1000000;
    return num.toFixed(2) + ' ms';
  }

  //microseconds
  if (len >= 4) {
    num = num / 1000;
    return num.toFixed(2) + ' μs';
  }

  return num + ' ns';
}
