/**
 * Sharebox client side lib
 */

(function (we) {

we.sharebox = {
  selector: null,

  init: function init(labelSelector, selector) {
    this.selector = selector;

    $(labelSelector).click(function(){
      $('.sharebox-area').addClass('open');
      $('#post-body').focus();
    });


    $(selector+ ' button[name=cancel]').click(function(){
      $('.sharebox-area').removeClass('open');
      $(selector+ ' form')[0].reset();
      $(selector+' textarea').val(' ');
    });

  },
  showSharebox: function showSharebox() {

  }
};

})(window.we);