# hapi-pioc
A [hapi.js](http://hapijs.com) plugin for the
[pioc](http://npmjs.com/package/pioc) dependency injection container

# What?
When developing node.js applications, it can sometimes be hard to get the
information you need to the place where you need it. It can also be hard to
create mocks for testing when you rely on the native `require` function as you've
just hard-coded the path to the service.

By using the _Inversion of Control_ pattern, you decouple a service from
the places where it is used.

**hapi-pioc** extends the hapi server object by adding a `lookup` method
that can be used to fetch a service. Thus it follows the **Service Locator**
pattern.

Within your services however, you are free to rely on **Dependency Injection**
through **Constructor Injection**, **Property Injection** or
**Lazy Property Injection**.

# Why?
Because I honestly believe that _Inversion of Control_ is the right way to implement
an application.

The best possible case would've been to use **Dependency Injection** within the
route handlers as well but that didn't work well. Using a **Service Locator**
is still better than fetching services yourself so it seems like a good compromise.

# How?
Using the standard [hapi](http://hapijs.com) API, of course.

When you register your plugins, just also register the **hapi-pioc** plugin.
Personally, I prefer to use [glue](https://github.com/hapijs/glue) and make
this part of a `manifest.js`
and it might even make sense to separate the `services` option into a file of
its own. You should also be able to use this
with [confidence](https://github.com/hapijs/confidence) for ultimate flexibility.

```javascript
server.register({
    register: require('hapi-pioc'),
    options: {
        // relative paths are resolved against this path
        baseUrl: process.cwd(),
        // the name of the exposed method
        methodName: 'lookup',
        services: {
            // use the "value!" prefix to load as value
            'value!UserEncryptionPrivateKeyProvider': './lib/services/UserEncryptionPrivateKeyProvider',
            // without supports node_modules path resolution
            'value!Promise': 'bluebird',
            // the value can be any kind of pioc service,
            // only strings are resolved as paths
            'value!MongoConfiguration': {
                url: 'mongodb://localhost:27017/demo',
                settings: {
                    db: {
                        native_parser: false
                    }
                }
            },
            'MongoConnection': './lib/services/MongoConnection',
            'Post': './lib/services/models/Post',
            'User': './lib/services/models/User'
        }
    }
}, function(err, server) {
    // ...
})
```

And within your route handlers, you can now use the method to lookup services:
```javascript
server.route({
    path: '/{slug}',
    method: 'GET',
    handler(request, reply) {
        var Post = server.methods.lookup('Post');
        Post.getBySlug(request.params.slug)
            .then(result => createSinglePostAppData(request.path, result))
            .then(appData => renderApp(server, appData))
            .then(render(reply))
            .catch(reply);
    }
});
```

The above `Post` service is defined like this:

```javascript
var Joi = require('joi'),
    MongoQuery = require('lib/MongoQueryMixin'),
    ValidateMixin = require('lib/ValidateMixin');

exports[MongoQuery.collection] = 'posts';
exports[MongoQuery.indexes] = [
    [{slug: 1}, {unique: true}],
    [{tags: 1}]
];
Object.assign(exports, MongoQuery.Mixin, ValidateMixin, {
    schema: Joi.object().keys({
        slug: Joi.string().required(),
        title: Joi.string().required(),
        content: Joi.string().required(),
        html: Joi.string().optional(),
        tags: Joi.array().includes(Joi.string()).optional(),
        createdAt: Joi.date().required(),
        updatedAt: Joi.date().required()
    }),

    getBySlug(slug) {
        return this.findOne({ slug });
    },

    getPage(query, options = { sort: '-created', limit: 20, page: 1 }, fields = '') {
        var { sort, limit, page } = options;
        return this.pagedFind(query, fields, sort, limit, page);
    },

    updateById(id, data) {
        var update = { $set: data };
        update.$currentDate = { updatedAt: true };
        return this.findByIdAndUpdate(id, update);
    }
});
```

You'll probably notice that I'm still using the `require` statement and that is
just fine. The two mixins that I'm importing are utilities, not services.
Being mixins however, they can naturally depend on services themself, like this:

```javascript
import { inject } from 'pioc';
import Mongo from 'mongodb';
import Promise from 'bluebird';

/**
* A mixin for objects that expose the following properties:
* - [collection]: String => The collection name
* - [indexes]: Array<IndexDefinition> => the indexes
*/
export var collection = Symbol();
export var indexes = Symbol();
export var Mixin = {
    connection: inject('MongoConnection'),

    collection() {
        return this.connection.get().then(db => db.collection(this[collection]));
    },
    // ...
};
```

This pattern is well supported by pioc and when the `Post` service is resolved,
the `MongoConnection` service is injected into the `Post` service.

If, at some point, I were to decide that I'd like to use a cache in front of
the `Post` service, I'd just define it as the service implementation by updating
the configuration. If I were using confidence and multiple servers, I could even
A/B test it that way as long as the cache implementation offered the same interface.

# Summary
By using the _Inversion of Control_ pattern, you can start to decouple your application.
Route handlers become the simple controllers they were meant to be while your service
layer is independent, easily testable and reusable.

[pioc](http://npmjs.com/package/pioc) in particular supports many styles of
module definitions and injections and can be an important part in any modern
application, especially for isomorphic applications.

# Changelog
- 0.1.1 Include pioc as dependency
