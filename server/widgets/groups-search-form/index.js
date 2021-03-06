/**
 * Widget groups-search-form main file
 *
 * See https://github.com/wejs/we-core/blob/master/lib/class/Widget.js for all Widget prototype functions
 */
var widgetUtils = require('../../../lib/widgetUtils');

module.exports = function (projectPath, Widget) {
  var widget = new Widget('groups-search-form', __dirname);

  widget.checkIfIsValidContext = widgetUtils.checkIfIsValidContext;
  widget.isAvaibleForSelection = widgetUtils.isAvaibleForSelection;
  widget.beforeSave = widgetUtils.beforeSave;
  widget.renderVisibilityField = widgetUtils.renderVisibilityField;

  return widget;
};