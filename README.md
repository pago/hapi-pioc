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
