import declare from 'dojo/_base/declare';
import BaseWidgetSetting from 'jimu/BaseWidgetSetting';
import _QueryableLayerSourcePopup from 'jimu/dijit/_QueryableLayerSourcePopup';
import lang from 'dojo/_base/lang';
import on from 'dojo/on';
import html from 'dojo/_base/html';
import jimuUtils from 'jimu/utils';
import query from 'dojo/query';

export default declare([BaseWidgetSetting], {
  baseClass: 'batch-upload-setting',
  layerInfo: null,

  postCreate() {
    // the config object is passed in
    this.setConfig(this.config);
  },

  setConfig(config) {
    this.layerInfo = config.layerInfo;
    if (this.layerInfo) {
      this._createTarget(this.layerInfo.name, this.layerInfo.url);
    }
  },

  getConfig() {
    // WAB will get config object through this method
    return {
      maxRecordCount: 1000,
      layerInfo: this.layerInfo
    };
  },

  _onBtnAddItemClicked: function() {
    var args = {
      titleLabel: this.nls.setDataSource,

      dijitArgs: {
        multiple: false,
        createMapResponse: this.map.webMapResponse,
        portalUrl: this.appConfig.portalUrl,
        style: {
          height: '100%'
        }
      }
    };

    var sourcePopup = new _QueryableLayerSourcePopup(args);
    this.own(on(sourcePopup, 'ok', lang.hitch(this, function(item) {
      this.layerInfo = {
        name: item.name,
        url: item.url
      };
      sourcePopup.close();
      sourcePopup = null;

      // check if a layer has already been set
      var itemDoms = query('.item', this.listContent);
      if (itemDoms.length > 0) {
        html.destroy(itemDoms[0]);
        this._createTarget(item.name, item.url);
      } else {
        this._createTarget(item.name, item.url);
      }
    })));

    this.own(on(sourcePopup, 'cancel', lang.hitch(this, function() {
      sourcePopup.close();
      sourcePopup = null;
    })));

    sourcePopup.startup();
  },

  _createTarget: function(name, url) {
    name = name || "";
    url = url || "";
    var target = html.create("div", {
      "class": "item",
      "innerHTML": '<div class="label jimu-ellipsis" title="' + name + '"><b>' + name + '</b>: ' + url + '</div>' +
        '<div class="actions jimu-float-trailing">' +
        '<div class="delete action jimu-float-trailing"></div>' +
        '</div>'
    }, this.listContent);
    return target;
  },

  _onListContentClicked: function(event) {
    var target = event.target || event.srcElement;
    var itemDom = jimuUtils.getAncestorDom(target, function(dom) {
      return html.hasClass(dom, 'item');
    }, 3);
    if (!itemDom) {
      return;
    }
    if (html.hasClass(target, 'action')) {
      if (html.hasClass(target, 'delete')) {
        html.destroy(itemDom);
      }
      return;
    }
  }
});
