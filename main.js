(function () {
    'use strict';

    function extend(to, from) {
        for (var prop in from) {
            if (from.hasOwnProperty(prop)) {
                to[prop] = from[prop];
            }
        }

        return to;
    }

    var Extendable = (function () {
        function Extendable() {}

        Extendable.extend = function (protoProps, staticProps) {
            var parent = this;

            var child = protoProps && hasOwnProperty.call(protoProps, 'constructor')
                ? protoProps.constructor : function () { return parent.apply(this, arguments); };

            extend(child, staticProps);

            var Fn = function () {};
            Fn.prototype = parent.prototype;

            child.prototype = new Fn();

            extend(child.prototype, protoProps);

            child.prototype.constructor = child;

            return child;
        }

        return Extendable;
    })();

    var CacheService = Extendable.extend({
        constructor: function (target, duration) {
            this._target   = target;
            this._duration = duration || CacheService.EXPIRE_TIME_DEFAULT;
        },

        _parse: function () {
            var raw = localStorage.getItem(this._target);

            return !raw ? {} : JSON.parse(raw);
        },

        put: function (key, value) {
            var cache = this._parse();

            cache[key] = {
                expireAt: (new Date).getTime() + this._duration,
                value:    value
            };

            localStorage.setItem(this._target, JSON.stringify(cache));
        },

        retrieve: function (key) {
            var cache = this._parse(),
                data  = cache[key];

            if (!data || parseInt(data.expireAt) - (new Date).getTime() > 0) {
                delete cache[key];
                return undefined;
            }

            return data.value;
        }
    }, {
        EXPIRE_TIME_DEFAULT: .25 * 60 * 1000
    });

    var LoaderService = Extendable.extend({
        constructor: function () {
            this._cache = new CacheService('test:files');
        },

        load: function (url, onSuccess, onError) {
            var cache = this._cache,
                value = cache.retrieve(url);

            if (value) {
                return onSuccess(value);
            }

            var request = new XMLHttpRequest();

            request.onload = request.onreadystatechange = function () {
                if (request.readyState === 4) {
                    if (request.status === 200) {
                        cache.put(url, request.responseText);

                        if (typeof onSuccess === 'function') {
                            onSuccess(request.responseText);
                        }
                    } else if (typeof onError === 'function') {
                        onError();
                    }
                }
            }

            request.open('GET', url, true);
            request.send();
        }
    });

    var ParserService = Extendable.extend({
        _callback: function (text) {
            return text;
        },

        parse: function (url) {
            var ext = url.substr(url.lastIndexOf('.') + 1);
            console.log(ext);
            try {
                switch (ext) {
                    case 'json':
                        return JSON.parse(data).text;
                    case 'js':
                        window.cb = this._callback;
                        var result = eval(data).text;
                        delete window.cb;
    		            return result;
                    case 'txt':
                        return data;
                    default:
                        return 'unknown extension';
                }
            } catch (e) {
                return e;
            }
        }
    });

    var App = Extendable.extend({
        constructor: function () {
            this._loader = new LoaderService();
            this._parser = new ParserService();
        },

        _onSuccess: function (str) {
            this._output.value = this._parser.parse(str);
        },

        _onError: function (e) {
            this._output.value = 'Не удалось загрузить файл';
        },

        start: function () {
            this._input  = document.getElementById('input');
            this._output = document.getElementById('output');

            this._input.onchange = this.update.bind(this);

            this.update();
        },

        update: function () {
            this._output.value = 'Загрузка...';

            this._loader.load(
                this._input.value,
                this._onSuccess.bind(this),
                this._onError.bind(this)
            );
        }
    });

    var app = new App();

    window.onload = app.start.bind(app);
})();
