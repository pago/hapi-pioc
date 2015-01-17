var pioc = require('pioc'),
    path = require('path'),
    toString = Object.prototype.toString;

exports.register = function(server, options, next) {
    var baseUrl = options.baseUrl || process.cwd(),
        $module = pioc.createModule(options.baseUrl),
        $provider = pioc.createProvider($module),
        $injector = pioc.createInjector($module, $provider),
        services = options.services;

    Object.keys(services).forEach(function(serviceName) {
        var service = getServiceValue(baseUrl, services[serviceName]);

        if(serviceName.match(/^value!/)) {
            $module.value(serviceName.substr('value!'.length), service);
        } else if(serviceName.match(/^factory!/)) {
            $module.factory(serviceName.substr('factory!').length, service);
        } else {
            $module.bind(serviceName, service);
        }
    });

    $module
        .value('module', $module)
        .value('provider', $provider)
        .value('injector', $injector);

    server.method(options.methodName || 'lookup', createLookup($provider, $injector));
    next();
};

function getServiceValue(baseUrl, serviceSource) {
    if(toString.call(serviceSource) === '[object String]') {
        if(serviceSource[0] !== '.') {
            return require(serviceSource);
        }
        return require(path.normalize(path.join(baseUrl, serviceSource)))
    }
    return serviceSource;
}

function createLookup(provider, injector) {
    var lookup = function(serviceName) {
        return provider.get(serviceName);
    };

    lookup.all = function(servicePrefix) {
        return provider.getAll(servicePrefix);
    };

    lookup.has = function(serviceName) {
        return provider.has(serviceName);
    };

    lookup.inject = function(callback) {
        return injector.resolve(callback);
    };

    return lookup;
}

exports.register.attributes = {
    pkg: require('./package.json')
};
