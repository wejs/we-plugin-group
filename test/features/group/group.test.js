var assert = require('assert');
var request = require('supertest');
var helpers = require('we-test-tools').helpers;
var stubs = require('we-test-tools').stubs;
var http, async, we, _;

describe('groupFeature', function () {
  var salvedGroup, salvedUser, salvedUserPassword, salvedUser2, salvedUser2Password, salvedImage;
  var salvedPosts;
  var authenticatedRequest, authenticatedRequest2;

  before(function (done) {
    http = helpers.getHttp();
    we = helpers.getWe();
    async = we.utils.async;
    _ = we.utils._;

    var userStub = stubs.userStub();

    helpers.createUser(userStub, function (err, user) {
      if (err) return done(err);

      salvedUser = user;
      salvedUserPassword = userStub.password;

      // upload one stub image:
      request(http)
      .post('/api/v1/image')
      .attach('image', stubs.getImageFilePath())
      .end(function (err, imgRes) {
        if(err) throw err;
        salvedImage = imgRes.body.image;

        var stub = stubs.groupStub(user.id);
        we.db.models.group.create(stub)
        .then(function (g) {

          salvedGroup = g;

          var posts = [
            stubs.postStub(salvedUser.id),
            stubs.postStub(salvedUser.id),
            stubs.postStub(salvedUser.id)
          ];

          posts[2].images = [salvedImage.id];

          salvedPosts = [];

          async.eachSeries(posts, function (post, next) {
            we.db.models.post.create(post)
            .then(function (p) {
              salvedPosts.push(p);
              salvedGroup.addPost(p)
              .then(function(){
                next();
              }).catch(next);
            }).catch(next);
          }, function(err) {
            if (err) return done(err);

            // login user and save the browser
            authenticatedRequest = request.agent(http);
            authenticatedRequest.post('/login')
            .set('Accept', 'application/json')
            .send({
              email: salvedUser.email,
              password: salvedUserPassword
            })
            .expect(200).end(function() {

              var userStub = stubs.userStub();
              helpers.createUser(userStub, function(err, user) {
                if (err) return done(err);
                salvedUser2 = user;
                salvedUser2Password = userStub.password;
                // login user and save the browser
                authenticatedRequest2 = request.agent(http);
                authenticatedRequest2.post('/login')
                .set('Accept', 'application/json')
                .send({
                  email: salvedUser2.email,
                  password: salvedUser2Password
                })
                .expect(200)

                .end(done);
              });
            });
          });
        }).catch(done);
      });
    });
  });

  describe('find', function () {
    it('get /group route should find groups array', function (done) {
      request(http)
      .get('/group')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function (err, res) {
        if (err) throw err;
        assert(res.body.group);
        assert( _.isArray(res.body.group) , 'group not is array');
        assert(res.body.meta);
        assert(res.body.meta.count >= 1);
        done();
      });
    });

    it('get /user/userId/membership route should find user memberships array', function (done) {
      console.log('>>>>', salvedUser.id+1);

      authenticatedRequest
      .get('/user/'+ salvedUser.id +'/membership')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function (err, res) {
        if (err) throw err;
        assert(res.body.membership);
        assert( _.isArray(res.body.membership) , 'group not is array');
        assert(res.body.meta);
        done();
      });
    });

    it('get /user/[userId]/find-new-groups?where=%7B%7D&limit=9&sort=createdAt+DESC. route should find new groups to user', function (done) {

      var userStub = stubs.userStub();
      helpers.createUser(userStub, function(err, user) {
        if (err) throw err;
        var stub = stubs.groupStub(user.id);

        we.db.models.group.create(stub)
        .then(function (g) {

          authenticatedRequest
          .get('/user/'+ salvedUser.id +'/find-new-groups?where=%7B%7D&limit=9&sort=createdAt+DESC')
          .set('Accept', 'application/json')
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);

            assert(res.body.group);
            assert( _.isArray(res.body.group) , 'group not is array');
            assert(res.body.meta);

            var haveTheTestGroup = false;
            res.body.group.forEach(function (group){
              assert(group.id != salvedGroup.id);
              if (group.id == g.id) haveTheTestGroup = true;
            });

            assert(haveTheTestGroup);

            done();
          });
        }).catch(done);
      });
    });

    it('get /group?where=%7B%7D&limit=9&sort=createdAt+DESC route should find group list', function (done) {
      authenticatedRequest
      .get('/group?where=%7B%7D&limit=9&sort=createdAt+DESC')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        assert.equal(200, res.status);
        assert(res.body.group);
        assert( _.isArray(res.body.group) , 'group not is array');
        assert(res.body.meta);
        done();
      });
    });

  });

  describe('create', function () {
    it('post /group create one group record', function (done) {
      this.slow(150);

      var groupStub = stubs.groupStub(salvedUser.id);

      authenticatedRequest
      .post('/group/create')
      .send(groupStub)
      .set('Accept', 'application/json')
      .expect(201)
      .end(function (err, res) {
        if (err) throw err;

        assert(res.body.group);
        assert(res.body.group.id);
        assert(res.body.group.name, groupStub.name);

        we.db.models.group.findById(res.body.group.id)
        .then(function (g) {
          // check if creator is member
          g.getMembers().then(function (users) {
            var membersIds = users.map(function(u) {
              return u.id;
            });
            assert(membersIds.indexOf(salvedUser.id) > -1);
            done();
          }).catch(done);
        }).catch(done);
      });
    });
  });

  describe('findOne', function () {
    it('get /group/:id should return one group', function (done){
      request(http)
      .get('/group/' + salvedGroup.id)
      .set('Accept', 'application/json')
      .expect(200)
      .end(function (err, res) {
        if (err) throw err;
        assert(res.body.group);
        assert(res.body.group.id, salvedGroup.id);
        assert(res.body.group.name, salvedGroup.name);
        assert(res.body.group.meta.membersCount == 1);
        done();
      });
    });

    it('get /group/:id should return redirect to /post if are html request', function (done){

      request(http)
      .get('/group/' + salvedGroup.id)
      .expect(302)
      .end(function (err, res) {
        if (err) throw err;
        assert.equal(res.header.location, '/group/'+salvedGroup.id+'/post');
        done();
      });
    });
  });

  describe('groupPost', function () {
    it('post /post/create should create one post in group with groupId in body params', function (done) {
      var postStub = stubs.postStub(salvedUser.id);
      postStub.group = salvedGroup.id;

      request(http)
      .post('/post/create')
      .set('Accept', 'application/json')
      .send(postStub)
      .expect(201)
      .end(function (err, res) {
        if (err) throw err;

        assert(res.body.post.id);
        assert.equal(res.body.post.body, postStub.body);

        done();
      });
    });

    it('get /group/:groupId/post should return posts list inside group', function (done) {
      request(http)
      .get('/group/'+ salvedGroup.id +'/post')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function (err, res) {
        if (err) throw err;
        assert(res.body.post);
        assert(_.isArray(res.body.post) , 'post not is array');
        assert(res.body.meta.count);
        assert(res.body.meta.count >= 3);
        // checa se o grupo do posst é o mesmo da busca
        res.body.post.forEach(function (post){
          assert.equal(post.groupId, salvedGroup.id);
        });

        done();
      });
    });

    it('get /group/:groupId/post?objectType=image should return posts with images', function (done) {

      request(http)
      .get('/group/'+ salvedGroup.id +'/post?objectType=image')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function (err, res) {
        if (err) throw err;

        assert(res.body.post);
        assert( _.isArray(res.body.post) , 'post not is array');
        assert(res.body.meta.count);
        assert(res.body.meta.count >= 1);
        // checa se o grupo do posst é o mesmo da busca
        res.body.post.forEach(function (post){
          assert.equal(post.groupId, salvedGroup.id);
        });

        done();
      });

    });
  });

  describe('groupMembers', function () {
    it('post /api/v1/group/:groupId/join route should add authenticated user in group', function (done) {

      authenticatedRequest
      .post('/api/v1/group/'+ salvedGroup.id +'/join')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function (err, res) {
        if (err) throw err;

        assert(res.body.membership);
        assert.equal(res.body.membership.userId, salvedUser.id);

        salvedGroup.findOneMember(salvedUser.id, function(err, membership) {
          if (err) throw err;
          assert.equal(membership.userId,  salvedUser.id);
          done();
        });
      });
    });

    it('get /group/:groupId/member route should return membership users', function (done) {
      authenticatedRequest
      .get('/group/'+ salvedGroup.id + '/member')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) throw err;
        assert.equal(200, res.status);
        assert(res.body.membership);
        assert(res.body.meta.count);
        done();
      });
    });

    it('get /group/:groupId/member route should return membership users with role filter', function (done) {
      authenticatedRequest
      .get('/group/'+ salvedGroup.id +'/member?roleNames[]=member')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) throw err;
        assert.equal(200, res.status);
        assert(res.body.membership);
        assert(res.body.meta.count);
        done();
      });
    });

    it('post /api/v1/group/:groupId/leave route should add authenticated user in group', function (done) {
      authenticatedRequest
      .post('/api/v1/group/'+ salvedGroup.id +'/leave')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) throw err;
        assert.equal(204, res.status);
        salvedGroup.findOneMember(salvedUser.id, function(err, membership) {
          if (err) throw err;
          assert(!membership);
          done();
        });
      });
    });

  });
});
