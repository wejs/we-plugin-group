const util =  {
  checkIfIsValidContext(context) {
    if (!context || context.indexOf('group-') !== 0) {
      return false;
    } else {
      return true
    }
  },

  isAvaibleForSelection(req) {
    if (!req.header) return false;

    let reqContext = req.header('wejs-context');

    if (util.checkIfIsValidContext(reqContext)) {
      return true;
    } else {
      return false;
    }
  },
  beforeSave(req, res, next) {
    // check context in create
    if (res.locals.id || util.checkIfIsValidContext(req.body.context)) {
      next();
    } else {
      next(new Error(res.locals.__('widget.invalid.context')));
    }
  },
  renderVisibilityField(widget, context, req, res) {
    let field = '';

    // visibility field
    field += '<div class="form-group"><div class="row">' +
      '<label class="col-sm-4 control-label">'+
      res.locals.__('widget.visibility') + '</label>'+
    '<div class="col-sm-8"><select name="visibility" class="form-control">';

    field +=
    '<option value="in-context" selected value="'+context+'">'+
      res.locals.__('widget.in-context')+
    '</option>'+
    '</select></div></div>'+
    '</div><hr>';

    return field;
  }
}

module.exports = util;