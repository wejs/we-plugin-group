/**
 * Post client side lib
 */

(function (we) {

we.post = {
  lastCheckData: new Date().toISOString(),
  checkNewPostsTime: 10000,
  count: 0,

  init: function init() {
    // check if is posts page
    if (!$('body').hasClass('post') || !$('body').hasClass('find'))
      return '';
    this.registerNewCheck();
  },

  registerNewCheck: function registerNewCheck() {
     setTimeout(this.getNewPosts.bind(this), this.checkNewPostsTime);
  },

  getNewPosts: function getNewPosts() {
    var self = this;

    $.ajax({
      url: location.pathname,
      data: {
        responseType: 'modal',
        teaserList: true,
        since: self.lastCheckData
      }
    }).then(function (data){
      // console.log(data);
      var html = $(data);
      var count = html[html.length-1].innerHTML;

      self.count = self.count + Number(count);
      // update last check time
      self.lastCheckData = new Date().toISOString();

      if (self.count) self.renderNewPosts();

    }).fail(function (err) {
      console.error('we.post.js:error in getNewsPosts:', err);
    }).always(function () {
      self.registerNewCheck();
    });
  },

  /**
   * Render and show news posts alert messages
   */
  renderNewPosts: function renderNewPosts() {
    document.getElementById('haveNewPostsCount').innerText = this.count;
    document.getElementById('haveNewPosts').style.display = 'block';
  }
};

we.post.init();

})(window.we);