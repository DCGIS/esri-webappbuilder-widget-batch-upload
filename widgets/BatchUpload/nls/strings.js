define({
  root: {
    widgetTitle: 'Batch Upload',
    description: 'A custom Web AppBuilder widget.',
    addFromFile: {
      intro: "You can drop or browse for one the following file types:",
      types: {
        "Shapefile": "A Shapefile (.zip, ZIP archive containing all shapefile files)",
        "CSV": "A CSV File (.csv, with address or latitude, longitude and comma, semi-colon or tab delimited)",
        "GPX": "A GPX File (.gpx, GPS Exchange Format)",
        "GeoJSON": "A GeoJSON File (.geo.json or .geojson)"
      },
      generalizeOn: "Generalize features for web display",
      dropOrBrowse: "Drop or Browse",
      browse: "Browse",
      invalidType: "This file type is not supported.",
      addingPattern: "{filename}: adding...",
      addFailedPattern: "{filename}: add failed",
      featureCountPattern: "{filename}: {count} feature(s)",
      invalidTypePattern: "{filename}: this type is not supported",
      maxFeaturesAllowedPattern: "A maximum of {count} features is allowed",
      layerNamePattern: "{filename} - {name}"
    },
    addFeatures: "Submit Address Points",
    deleteFeatures: "Undo Upload",
    clearFeatures: "Clear Uploaded Features",
    deletePromptTitle: "Delete Uploaded Features",
    errorSavingPromptTitle: "Save Uploaded Features Error",
    deletePrompt: "Are you sure you want to remove the last set of uploaded features?",
    yes: "Yes",
    no: "No",
    ok: "OK",
    fieldsPage: {
      title: "Configure fields for <b>${layername}</b>",
      description: "Use the Preset column to allow the user to enter a value prior to creating a new feature. Use the Actions edit button to activate Smart Attributes on a layer. The Smart Attributes can require, hide or disable a field based on values in other fields.",
      fieldsNotes: "* is a required field.  If you uncheck Display for this field, and the edit template does not populate that field value, you will not be able to save a new record.",
      fieldsSettingsTable: {
        display: "Display",
        displayTip: "Determine whether the field is not visible",
        edit: "Editable",
        editTip: "Check on if the field is present in the attribute form",
        fieldName: "My Data Fields",
        fieldNameTip: "Name of the field from the uploaded data source",
        fieldSource: "Database Fields",
        fieldSourceTip: "Name of the field from the address point feature service"
      }
    }
  }
  // add supported locales below:
  // , "zh-cn": true
});
