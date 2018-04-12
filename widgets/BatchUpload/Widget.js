import declare from 'dojo/_base/declare';
import BaseWidget from 'jimu/BaseWidget';
import i18n from 'dojo/i18n!./nls/strings';
import array from 'dojo/_base/array';
import lang from 'dojo/_base/lang';
import on from 'dojo/on';
import Message from 'jimu/dijit/Message';
import domClass from 'dojo/dom-class';
import Deferred from 'dojo/Deferred';
import esriRequest from 'esri/request';
import sniff from 'dojo/sniff';
import util from './util';
import portalUtils from 'jimu/portalUtils';
import portalUrlUtils from 'jimu/portalUrlUtils';
import Graphic from 'esri/graphic';
import Point from 'esri/geometry/Point';
import FeatureLayer from 'esri/layers/FeatureLayer';
import Popup from 'jimu/dijit/Popup';
import Table from 'jimu/dijit/SimpleTable';
import SimpleMarkerSymbol from 'esri/symbols/SimpleMarkerSymbol';
import Color from 'esri/Color';
import SimpleLineSymbol from 'esri/symbols/SimpleLineSymbol';
import SimpleRenderer from 'esri/renderers/SimpleRenderer';
import domConstruct from 'dojo/dom-construct';
import dom from 'dojo/dom';
import Select from 'dijit/form/Select';
import query from 'dojo/query';
import registry from 'dijit/registry';
// To create a widget, you need to derive from BaseWidget.
export default declare([BaseWidget], {

  // Custom widget code goes here

  baseClass: 'batch-upload',
  i18n: i18n,
  SHAPETYPE_ICONS: [{
    "type": "shapefile",
    "url": "images/filetypes/zip.svg"
  }, {
    "type": "csv",
    "url": "images/filetypes/csv.svg"
  }, {
    "type": "gpx",
    "url": "images/filetypes/gpx.svg"
  }, {
    "type": "geojson",
    "url": "images/filetypes/geojson.svg"
  }],
  maxRecordCount: 1000,
  maxRecordThreshold: 100000,
  uploadedFeatureCollection: null,
  uploadedObjectIds: null,
  dataFieldMappingValues: [],
  fields: [],

  // methods to communication with app container:
  postCreate() {
    this.inherited(arguments);
  },

  startup() {
    // set the fields from the service specified in the config
    this._getFieldsData(this.config.layerInfo);
    // don't show the add features button initally
    this.addButtonDiv.style.display = 'none';
    this.deleteButtonDiv.style.display = 'none';
    this.removeButton.style.display = 'none';
    this.fieldsTable.style.display = 'none';
    this.uploadedObjectIds = [];
    const self = this,
      dropNode = this.dropArea;

    this.inherited(arguments);

    let v = 0;
    try {
      v = Number(this.config.maxRecordCount);
      if (typeof v === "number" && !isNaN(v)) {
        v = Math.floor(v);
        if (v >= 1 && v <= this.maxRecordThreshold) {
          this.maxRecordCount = v;
        }
      }
    } catch (ex) {
      console.warn("Error setting AddFromFile.maxRecordCount:");
      console.warn(ex);
    }

    // add the images to the upload ui widget
    if (i18n.addFromFile.types) {
      try {
        for (var fileTypeName in i18n.addFromFile.types) {
          this._createFileTypeImage(fileTypeName);
        }
      } catch (ex) {
        console.warn("Error reading support file types:");
        console.warn(ex);
      }
    }

    this.own(on(this.fileNode, "change", function() {
      if (!self._getBusy()) {
        self.addButtonDiv.style.display = 'none';
        self.removeButton.style.display = 'none';
        self._destroyTable();
        // domConstruct.empty('fieldsTableAll');
        self._setBusy(true);
        var fileInfo = self._getFileInfo();
        if (fileInfo.ok) {
          self._execute(fileInfo);
        }
      }
    }));

    this.own(on(this.uploadLabel, "click", function(event) {
      if (self._getBusy()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }));

    this.own(on(dropNode, "dragenter", function(event) {
      event.preventDefault();
      if (!self._getBusy()) {
        domClass.add(dropNode, "hit");
        self._setStatus("");
      }
    }));
    this.own(on(dropNode, "dragleave", function(event) {
      event.preventDefault();
      domClass.remove(dropNode, "hit");
    }));
    this.own(on(dropNode, "dragover", function(event) {
      event.preventDefault();
    }));
    this.own(on(dropNode, "drop", function(event) {
      event.preventDefault();
      event.stopPropagation();
      self.addButtonDiv.style.display = 'none';
      self.deleteButtonDiv.style.display = 'none';
      self.removeButton.style.display = 'none';
      self.fieldsTable.style.display = 'none';
      self._destroyTable();
      if (!self._getBusy()) {
        self._setBusy(true);
        var fileInfo = self._getFileInfo(event);
        if (fileInfo.ok) {
          self._execute(fileInfo);
        }
      }
    }));

    // by default, dropping a file on a page will cause
    // the browser to navigate to the file
    var nd = this.domNode;
    this.own(on(nd, "dragenter", function(event) {
      event.preventDefault();
    }));
    this.own(on(nd, "dragleave", function(event) {
      event.preventDefault();
    }));
    this.own(on(nd, "dragover", function(event) {
      event.preventDefault();
    }));
    this.own(on(nd, "drop", function(event) {
      event.preventDefault();
    }));

    this.own(on(this.hintButton, "click", lang.hitch(this, function(event) {
      event.preventDefault();

      var test = self.helptext();

      new Message({
        message: test
      });
    })));
  },

  _getFieldsData: function(layerInfo) {
    const self = this;
    const req = esriRequest({
      url: layerInfo.url,
      content: {
        f: 'json'
      }
    });
    req.then(function(response) {
      // set the fields from the map service
      self.fields = response.fields;
    });
  },

  helptext: function() {
    return '<div class="intro">' +
      '<label>' + i18n.addFromFile.intro + "</label>" +
      '<ul>' +
      '<li>' + i18n.addFromFile.types.Shapefile + '</li>' +
      '<li>' + i18n.addFromFile.types.CSV + '</li>' +
      '<li>' + i18n.addFromFile.types.GPX + '</li>' +
      '<li>' + i18n.addFromFile.types.GeoJSON + '</li>' +
      '<li><span class="note">' + i18n.addFromFile.maxFeaturesAllowedPattern
      .replace("{count}", this.maxRecordCount) + '</span></li>' +
      '</ul>' +
      '</div>';
  },

  _execute: function(fileInfo) {
    this._setBusy(true);
    var fileName = fileInfo.fileName;
    this._setStatus(i18n.addFromFile.addingPattern
      .replace("{filename}", fileName));
    var self = this,
      formData = new FormData();
    formData.append("file", fileInfo.file);
    var job = {
      map: this.map,
      sharingUrl: this._getSharingUrl(),
      baseFileName: fileInfo.baseFileName,
      fileName: fileInfo.fileName,
      fileType: fileInfo.fileType,
      // generalize: !!this.generalizeCheckBox.getValue(),
      publishParameters: {},
      numFeatures: 0
    };
    self._analyze(job, formData).then(function() {
      return self._generateFeatures(job, formData);
    }).then(function(response) {
      self.uploadedFeatureCollection = response.featureCollection.layers[0];
      // add the field mapping Table
      self._setFields(self.fields, self.uploadedFeatureCollection.layerDefinition.fields);
      // add the features to the map
      self._addFeatures(job, response.featureCollection);
      self.addButtonDiv.style.display = '';
      self.removeButton.style.display = '';
      self.fieldsTable.style.display = '';
      // set the UI to show the number of uploaded features
      util.setNodeText(self.messageNode, fileName);
      util.appendNodeText(self.messageNode, "Number of features:" + self.uploadedFeatureCollection.featureSet.features.length);
      self._setBusy(false);
    }).otherwise(function(error) {
      self._setBusy(false);
      self._setStatus(i18n.addFromFile.addFailedPattern
        .replace("{filename}", fileName));
      console.error("Error generating features.");
      console.error(error);
      if (error && typeof error.message === "string" && error.message.length > 0) {
        // e.g. The maximum number of records allowed (1000) has been exceeded.
        new Message({
          titleLabel: i18n._widgetLabel,
          message: error.message
        });
      }
    });
  },

  _analyze: function(job, formData) {
    if (job.fileType.toLowerCase() !== "csv") {
      var dfd = new Deferred();
      dfd.resolve(null);
      return dfd;
    }
    var url = job.sharingUrl + "/content/features/analyze";
    var content = {
      f: "json",
      filetype: job.fileType.toLowerCase()
    };
    var req = esriRequest({
      url: url,
      content: content,
      form: formData,
      handleAs: "json"
    });
    req.then(function(response) {
      //console.warn("Analyzed:",response);
      if (response && response.publishParameters) {
        job.publishParameters = response.publishParameters;
      }
    });
    return req;
  },

  _createFileTypeImage: function(fileTypeName) {
    var isRTL = window.isRTL;
    array.some(this.SHAPETYPE_ICONS, lang.hitch(this, function(filetypeIcon, index) {
      if (fileTypeName.toLowerCase() === filetypeIcon.type) {
        var iconImg = document.createElement("IMG");
        iconImg.src = this.folderUrl + filetypeIcon.url;
        iconImg.alt = fileTypeName;
        if (index === 0) {
          iconImg.className += " " + (isRTL ? "last" : "first") + "-type-icon";
        } else if (index === 1) {
          iconImg.className += " second-" + (isRTL ? "last" : "first") + "-type-icon";
        } else if (index === (this.SHAPETYPE_ICONS.length - 2)) {
          iconImg.className += " second-" + (isRTL ? "first" : "last") + "-type-icon";
        } else if (index === (this.SHAPETYPE_ICONS.length - 1)) {
          iconImg.className += " " + (isRTL ? "first" : "last") + "-type-icon";
        }
        this.supportedFileTypes.appendChild(iconImg);
      }
    }));
  },

  _getBaseFileName: function(fileName) {
    var a, baseFileName = fileName;
    if (sniff("ie")) { //fileName is full path in IE so extract the file name
      a = baseFileName.split("\\");
      baseFileName = a[a.length - 1];
    }
    a = baseFileName.split(".");
    //Chrome and IE add c:\fakepath to the value - we need to remove it
    baseFileName = a[0].replace("c:\\fakepath\\", "");
    return baseFileName;
  },

  _getBusy: function() {
    return domClass.contains(this.uploadLabel, "disabled");
  },

  _getFileInfo: function(dropEvent) {
    var file, files;
    var info = {
      ok: false,
      file: null,
      fileName: null,
      fileType: null
    };
    if (dropEvent) {
      files = dropEvent.dataTransfer.files;
    } else {
      files = this.fileNode.files;
    }
    if (files && files.length === 1) {
      info.file = file = files[0];
      info.fileName = file.name;
      if (util.endsWith(file.name, ".zip")) {
        info.ok = true;
        info.fileType = "Shapefile";
      } else if (util.endsWith(file.name, ".csv")) {
        info.ok = true;
        info.fileType = "CSV";
      } else if (util.endsWith(file.name, ".gpx")) {
        info.ok = true;
        info.fileType = "GPX";
      } else if (util.endsWith(file.name, ".geojson") ||
        util.endsWith(file.name, ".geo.json")) {
        info.ok = true;
        info.fileType = "GeoJSON";
      }
    }
    if (info.ok) {
      info.baseFileName = this._getBaseFileName(info.fileName);
    } else {
      var msg = i18n.addFromFile.invalidType,
        usePopup = true;
      if (typeof info.fileName === "string" && info.fileName.length > 0) {
        msg = i18n.addFromFile.invalidTypePattern
          .replace("{filename}", info.fileName);
      }
      this._setBusy(false);
      this._setStatus(msg);
      if (usePopup && files.length > 0) {
        var nd = document.createElement("div");
        nd.appendChild(document.createTextNode(msg));
        new Message({
          titleLabel: i18n._widgetLabel,
          message: nd
        });
      }
    }
    return info;
  },

  _generateFeatures: function(job, formData) {
    var url = job.sharingUrl + "/content/features/generate";
    job.publishParameters = job.publishParameters || {};
    var params = lang.mixin(job.publishParameters, {
      name: job.baseFileName,
      targetSR: job.map.spatialReference,
      maxRecordCount: this.maxRecordCount,
      enforceInputFileSizeLimit: true,
      enforceOutputJsonSizeLimit: true
    });
    var content = {
      f: "json",
      filetype: job.fileType.toLowerCase(),
      publishParameters: window.JSON.stringify(params)
    };
    return esriRequest({
      url: url,
      content: content,
      form: formData,
      handleAs: "json"
    });
  },

  _addFeatures: function(job, featureCollection) {
    //var triggerError = null; triggerError.length;
    var fullExtent, layers = [],
      map = job.map,
      nLayers = 0;
    // var loader = new LayerLoader();
    if (featureCollection.layers) {
      nLayers = featureCollection.layers.length;
    }
    array.forEach(featureCollection.layers, function(layer) {
      var featureLayer = new FeatureLayer(layer, {
        id: 'uploadedAddressPts',
        outFields: ["*"]
      });
      // create a better symbol then the default
      const line = new SimpleLineSymbol();
      line.setColor(new Color([230, 76, 0, 1]));
      const marker = new SimpleMarkerSymbol();
      marker.setSize(8);
      marker.setColor(new Color([230, 76, 0, 1]));
      marker.setOutline(line);
      var renderer = new SimpleRenderer(marker);
      featureLayer.setRenderer(renderer);
      // featureLayer.setSelectionSymbol(marker);
      featureLayer.xtnAddData = true;
      if (featureLayer.graphics) {
        job.numFeatures += featureLayer.graphics.length;
      }
      if (nLayers === 0) {
        featureLayer.name = job.baseFileName;
      } else if (typeof featureLayer.name !== "string" ||
        featureLayer.name.length === 0) {
        featureLayer.name = job.baseFileName;
      } else if (featureLayer.name.indexOf(job.baseFileName) !== 0) {
        featureLayer.name = i18n.addFromFile.layerNamePattern
          .replace("{filename}", job.baseFileName)
          .replace("{name}", featureLayer.name);
      }
      if (featureLayer.fullExtent) {
        if (!fullExtent) {
          fullExtent = featureLayer.fullExtent;
        } else {
          fullExtent = fullExtent.union(featureLayer.fullExtent);
        }
      }
      layers.push(featureLayer);
    });
    if (layers.length > 0) {
      map.addLayers(layers);
      if (fullExtent) {
        map.setExtent(fullExtent.expand(1.25), true);
      }
    }
  },

  addFeaturesClicked: function() {
    this.deleteButtonDiv.style.display = '';
    this.removeButton.style.display = 'none';
    this.addButtonDiv.style.display = 'none';
    this.fieldsTable.style.display = 'none';
    this._destroyTable();
    this._removeTempFeatureLayer();
    // construct the array of Graphics to submit to the feature service
    let submitFeatures = this._formatFeatures(this.uploadedFeatureCollection.featureSet.features, this.fields);
    this._applyBatchEdits(submitFeatures);
  },

  _applyBatchEdits: function(features) {
    const self = this;
    const req = esriRequest({
      url: this.config.layerInfo.url + '/addFeatures',
      content: {
        f: 'json',
        features: JSON.stringify(features)
      }
    }, {
      usePost: true
    });
    req.then(function(result) {
      let success = 0;
      // set the fields from the map service
      self.uploadedObjectIds.length = 0;
      // let success = 0;
      for (var i = 0; i < result.addResults.length; i++) {
        self.uploadedObjectIds.push(result.addResults[i].objectId);
        if (result.addResults[i].success === true) {
          success++;
        }
      }
      // refresh the map
      self._refreshMap();
      if (features.length > success) {
        self._promptForMissingSaves(success, features.length);
      }
    });
  },

  _refreshMap: function() {
    // const self = this;
    const layers = this.map.getLayersVisibleAtScale();
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].type === 'Feature Layer') {
        layers[i].refresh();
      }
    }
  },

  deleteFeaturesClicked: function() {
    this._promptToDelete();
  },

  _promptForMissingSaves: function(success, numSent) {
    const dialog = new Popup({
      titleLabel: this.nls.errorSavingPromptTitle,
      width: 400,
      maxHeight: 200,
      autoHeight: true,
      content: success + ' of ' + numSent + ' were successfully uploaded. \n You can click Undo Upload to try again.',
      buttons: [{
        label: this.nls.ok,
        classNames: ['jimu-btn'],
        onClick: lang.hitch(this, function() {
          dialog.close();
        })
      }]
    });
  },

  _promptToDelete: function() {
    const dialog = new Popup({
      titleLabel: this.nls.deletePromptTitle,
      width: 400,
      maxHeight: 200,
      autoHeight: true,
      content: this.nls.deletePrompt,
      buttons: [{
        label: this.nls.yes,
        classNames: ['jimu-btn'],
        onClick: lang.hitch(this, function() {
          this._deleteFeatures();
          dialog.close();
        })
      }, {
        label: this.nls.no,
        classNames: ['jimu-btn'],
        onClick: lang.hitch(this, function() {
          dialog.close();
        })
      }]
    });
  },

  _deleteFeatures: function() {
    const self = this;
    self.deleteButtonDiv.style.display = 'none';
    self.addButtonDiv.style.display = 'none';
    self.removeButton.style.display = 'none';
    self._destroyTable();
    // delete the features from the service
    let deleteFeatures = [];
    for (var i = 0; i < self.uploadedObjectIds.length; i++) {
      deleteFeatures.push(self.uploadedObjectIds[i]);
    }
    self._submitDelete(deleteFeatures);
  },

  _submitDelete: function(features) {
    const self = this;
    const req = esriRequest({
      url: this.config.layerInfo.url + '/deleteFeatures',
      content: {
        f: 'json',
        objectIds: features.toString()
      }
    }, {
      usePost: true
    });
    req.then(function() {
      self.deleteButtonDiv.style.display = 'none';
      self._refreshMap();
    });
  },

  removeFeaturesTempClicked: function() {
    this._removeTempFeatureLayer();
    this.deleteButtonDiv.style.display = 'none';
    this.addButtonDiv.style.display = 'none';
    this.removeButton.style.display = 'none';
    this.fieldsTable.style.display = 'none';
    this._destroyTable();
  },

  _removeTempFeatureLayer: function() {
    dom.byId(this.id + '_file').value = '';
    const addressPtsFLayer = this.map.getLayer('uploadedAddressPts');
    this.map.removeLayer(addressPtsFLayer);
  },

  _formatFeatures: function(features) {
    let self = this;
    let formattedFeatures = [];
    for (var i = 0; i < features.length; i++) {
      let feature = features[i];
      let newFeatures = {};
      self.dataFieldMappingValues.forEach(function(attributeMap) {
        if (attributeMap.importField !== 'Not Found') {
          newFeatures[attributeMap.databaseField] = feature.attributes[attributeMap.importField];
        }
      });
      // add the graphic to the array
      let pt = new Point(feature.geometry.x, feature.geometry.y, feature.geometry.spatialReference);
      let newGraphic = new Graphic(pt, null, newFeatures, null);
      formattedFeatures.push(newGraphic);
    }
    return formattedFeatures;
  },

  _setFields(databaseFields, uploadedFields) {
    let count = 0;
    let self = this;

    let matchableFields = uploadedFields.filter(function(field) {
      if (field.type !== "esriFieldTypeGeometry" &&
        field.type !== "esriFieldTypeOID" &&
        field.type !== "esriFieldTypeBlob" &&
        field.type !== "esriFieldTypeGlobalID" &&
        field.type !== "esriFieldTypeRaster" &&
        field.type !== "esriFieldTypeXML") {
        return field;
      }
    });
    self.dataFieldMappingValues.length = 0;
    databaseFields.forEach(function(dbField) {
      if (dbField.name !== 'OBJECTID' && dbField.name !== 'GlobalID') {
        let foundField = array.filter(matchableFields, function(item) {
          return item.name === dbField.name;
        });

        var displayEditFlag = foundField.visible;
        if (foundField.visible === false && foundField.isEditable === true) {
          displayEditFlag = true; //if field is editable, force display
        }

        let sourceName = 'Not Found';
        if (foundField[0] !== undefined) {
          sourceName = foundField[0].name;
        }
        // construct a drop down list of fields
        count++;
        let selectId = "fieldNo_" + count;

        const selectNode = new Select({
          id: selectId,
          style: {
            width: '100%'
          }
        });
        // add the onchange event
        selectNode.on('change', function(evt) {
          self._setFieldsOn(evt, selectNode.id);
        });

        self._fillDropdown(matchableFields, sourceName, selectNode);

        var tr = domConstruct.create("tr", {}, self.fieldsTableAll);

        var td1 = domConstruct.create("td", {}, tr);
        domConstruct.create("span", {
          innerHTML: dbField.name
        }, td1, 'first');

        var td2 = domConstruct.create("td", {}, tr);
        selectNode.placeAt(td2, 'last');

        self.dataFieldMappingValues.push({
          selectField: selectId,
          databaseField: dbField.name,
          importField: sourceName
        });
      }
    });
  },

  _setFieldsOn(val, ddBoxId) {
    let self = this;
    let selItem = self.dataFieldMappingValues.filter(function(item) {
      return item.selectField === ddBoxId;
    });
    if (selItem[0]) {
      selItem[0].importField = val;
    }
  },

  _fillDropdown: function(list, selectedItem, selectDijit) {
    const selectList = [];
    selectList.push({
      label: 'Not Found',
      value: 'Not_Found'
    });
    list.forEach(function(item) {
      selectList.push({
        label: item.name,
        value: item.name
      });
    });
    selectDijit.addOption(selectList);
    selectDijit.attr('displayedValue', selectedItem);
  },

  _setStatus: function(msg) {
    // if (this) {
    //   this._setStatus(msg);
    // }
  },
  _setBusy: function(isBusy) {
    if (isBusy) {
      domClass.add(this.uploadLabel, "disabled");
      domClass.add(this.dropArea, ["hit", "disabled"]);
    } else {
      domClass.remove(this.uploadLabel, "disabled");
      domClass.remove(this.dropArea, ["hit", "disabled"]);
    }
  },
  _getSharingUrl: function() {
    var p = portalUtils.getPortal(this.appConfig.portalUrl);
    return portalUrlUtils.getSharingUrl(p.portalUrl);
  },

  _destroyTable: function() {
    query('tr', this.fieldsTableAll).forEach(function(node) {
      if (node.className !== 'head-section table-header') {
        const allWidgets = registry.findWidgets(node);
        if (allWidgets.length > 0) {
          allWidgets[0].destroyRecursive(true);
        }
        domConstruct.destroy(node);
      }
    });
  }
});