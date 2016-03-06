(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
(function () {

    var async = {};
    function noop() {}
    function identity(v) {
        return v;
    }
    function toBool(v) {
        return !!v;
    }
    function notId(v) {
        return !v;
    }

    // global on the server, window in the browser
    var previous_async;

    // Establish the root object, `window` (`self`) in the browser, `global`
    // on the server, or `this` in some virtual machines. We use `self`
    // instead of `window` for `WebWorker` support.
    var root = typeof self === 'object' && self.self === self && self ||
            typeof global === 'object' && global.global === global && global ||
            this;

    if (root != null) {
        previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        return function() {
            if (fn === null) throw new Error("Callback was already called.");
            fn.apply(this, arguments);
            fn = null;
        };
    }

    function _once(fn) {
        return function() {
            if (fn === null) return;
            fn.apply(this, arguments);
            fn = null;
        };
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    // Ported from underscore.js isObject
    var _isObject = function(obj) {
        var type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
    };

    function _isArrayLike(arr) {
        return _isArray(arr) || (
            // has a positive integer length property
            typeof arr.length === "number" &&
            arr.length >= 0 &&
            arr.length % 1 === 0
        );
    }

    function _arrayEach(arr, iterator) {
        var index = -1,
            length = arr.length;

        while (++index < length) {
            iterator(arr[index], index, arr);
        }
    }

    function _map(arr, iterator) {
        var index = -1,
            length = arr.length,
            result = Array(length);

        while (++index < length) {
            result[index] = iterator(arr[index], index, arr);
        }
        return result;
    }

    function _range(count) {
        return _map(Array(count), function (v, i) { return i; });
    }

    function _reduce(arr, iterator, memo) {
        _arrayEach(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    }

    function _forEachOf(object, iterator) {
        _arrayEach(_keys(object), function (key) {
            iterator(object[key], key);
        });
    }

    function _indexOf(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === item) return i;
        }
        return -1;
    }

    var _keys = Object.keys || function (obj) {
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    function _keyIterator(coll) {
        var i = -1;
        var len;
        var keys;
        if (_isArrayLike(coll)) {
            len = coll.length;
            return function next() {
                i++;
                return i < len ? i : null;
            };
        } else {
            keys = _keys(coll);
            len = keys.length;
            return function next() {
                i++;
                return i < len ? keys[i] : null;
            };
        }
    }

    // Similar to ES6's rest param (http://ariya.ofilabs.com/2013/03/es6-and-rest-parameter.html)
    // This accumulates the arguments passed into an array, after a given index.
    // From underscore.js (https://github.com/jashkenas/underscore/pull/2140).
    function _restParam(func, startIndex) {
        startIndex = startIndex == null ? func.length - 1 : +startIndex;
        return function() {
            var length = Math.max(arguments.length - startIndex, 0);
            var rest = Array(length);
            for (var index = 0; index < length; index++) {
                rest[index] = arguments[index + startIndex];
            }
            switch (startIndex) {
                case 0: return func.call(this, rest);
                case 1: return func.call(this, arguments[0], rest);
            }
            // Currently unused but handle cases outside of the switch statement:
            // var args = Array(startIndex + 1);
            // for (index = 0; index < startIndex; index++) {
            //     args[index] = arguments[index];
            // }
            // args[startIndex] = rest;
            // return func.apply(this, args);
        };
    }

    function _withoutIndex(iterator) {
        return function (value, index, callback) {
            return iterator(value, callback);
        };
    }

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////

    // capture the global reference to guard against fakeTimer mocks
    var _setImmediate = typeof setImmediate === 'function' && setImmediate;

    var _delay = _setImmediate ? function(fn) {
        // not a direct alias for IE10 compatibility
        _setImmediate(fn);
    } : function(fn) {
        setTimeout(fn, 0);
    };

    if (typeof process === 'object' && typeof process.nextTick === 'function') {
        async.nextTick = process.nextTick;
    } else {
        async.nextTick = _delay;
    }
    async.setImmediate = _setImmediate ? _delay : async.nextTick;


    async.forEach =
    async.each = function (arr, iterator, callback) {
        return async.eachOf(arr, _withoutIndex(iterator), callback);
    };

    async.forEachSeries =
    async.eachSeries = function (arr, iterator, callback) {
        return async.eachOfSeries(arr, _withoutIndex(iterator), callback);
    };


    async.forEachLimit =
    async.eachLimit = function (arr, limit, iterator, callback) {
        return _eachOfLimit(limit)(arr, _withoutIndex(iterator), callback);
    };

    async.forEachOf =
    async.eachOf = function (object, iterator, callback) {
        callback = _once(callback || noop);
        object = object || [];

        var iter = _keyIterator(object);
        var key, completed = 0;

        while ((key = iter()) != null) {
            completed += 1;
            iterator(object[key], key, only_once(done));
        }

        if (completed === 0) callback(null);

        function done(err) {
            completed--;
            if (err) {
                callback(err);
            }
            // Check key is null in case iterator isn't exhausted
            // and done resolved synchronously.
            else if (key === null && completed <= 0) {
                callback(null);
            }
        }
    };

    async.forEachOfSeries =
    async.eachOfSeries = function (obj, iterator, callback) {
        callback = _once(callback || noop);
        obj = obj || [];
        var nextKey = _keyIterator(obj);
        var key = nextKey();
        function iterate() {
            var sync = true;
            if (key === null) {
                return callback(null);
            }
            iterator(obj[key], key, only_once(function (err) {
                if (err) {
                    callback(err);
                }
                else {
                    key = nextKey();
                    if (key === null) {
                        return callback(null);
                    } else {
                        if (sync) {
                            async.setImmediate(iterate);
                        } else {
                            iterate();
                        }
                    }
                }
            }));
            sync = false;
        }
        iterate();
    };



    async.forEachOfLimit =
    async.eachOfLimit = function (obj, limit, iterator, callback) {
        _eachOfLimit(limit)(obj, iterator, callback);
    };

    function _eachOfLimit(limit) {

        return function (obj, iterator, callback) {
            callback = _once(callback || noop);
            obj = obj || [];
            var nextKey = _keyIterator(obj);
            if (limit <= 0) {
                return callback(null);
            }
            var done = false;
            var running = 0;
            var errored = false;

            (function replenish () {
                if (done && running <= 0) {
                    return callback(null);
                }

                while (running < limit && !errored) {
                    var key = nextKey();
                    if (key === null) {
                        done = true;
                        if (running <= 0) {
                            callback(null);
                        }
                        return;
                    }
                    running += 1;
                    iterator(obj[key], key, only_once(function (err) {
                        running -= 1;
                        if (err) {
                            callback(err);
                            errored = true;
                        }
                        else {
                            replenish();
                        }
                    }));
                }
            })();
        };
    }


    function doParallel(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOf, obj, iterator, callback);
        };
    }
    function doParallelLimit(fn) {
        return function (obj, limit, iterator, callback) {
            return fn(_eachOfLimit(limit), obj, iterator, callback);
        };
    }
    function doSeries(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOfSeries, obj, iterator, callback);
        };
    }

    function _asyncMap(eachfn, arr, iterator, callback) {
        callback = _once(callback || noop);
        arr = arr || [];
        var results = _isArrayLike(arr) ? [] : {};
        eachfn(arr, function (value, index, callback) {
            iterator(value, function (err, v) {
                results[index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    }

    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = doParallelLimit(_asyncMap);

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.inject =
    async.foldl =
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachOfSeries(arr, function (x, i, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };

    async.foldr =
    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, identity).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };

    async.transform = function (arr, memo, iterator, callback) {
        if (arguments.length === 3) {
            callback = iterator;
            iterator = memo;
            memo = _isArray(arr) ? [] : {};
        }

        async.eachOf(arr, function(v, k, cb) {
            iterator(memo, v, k, cb);
        }, function(err) {
            callback(err, memo);
        });
    };

    function _filter(eachfn, arr, iterator, callback) {
        var results = [];
        eachfn(arr, function (x, index, callback) {
            iterator(x, function (v) {
                if (v) {
                    results.push({index: index, value: x});
                }
                callback();
            });
        }, function () {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    }

    async.select =
    async.filter = doParallel(_filter);

    async.selectLimit =
    async.filterLimit = doParallelLimit(_filter);

    async.selectSeries =
    async.filterSeries = doSeries(_filter);

    function _reject(eachfn, arr, iterator, callback) {
        _filter(eachfn, arr, function(value, cb) {
            iterator(value, function(v) {
                cb(!v);
            });
        }, callback);
    }
    async.reject = doParallel(_reject);
    async.rejectLimit = doParallelLimit(_reject);
    async.rejectSeries = doSeries(_reject);

    function _createTester(eachfn, check, getResult) {
        return function(arr, limit, iterator, cb) {
            function done() {
                if (cb) cb(getResult(false, void 0));
            }
            function iteratee(x, _, callback) {
                if (!cb) return callback();
                iterator(x, function (v) {
                    if (cb && check(v)) {
                        cb(getResult(true, x));
                        cb = iterator = false;
                    }
                    callback();
                });
            }
            if (arguments.length > 3) {
                eachfn(arr, limit, iteratee, done);
            } else {
                cb = iterator;
                iterator = limit;
                eachfn(arr, iteratee, done);
            }
        };
    }

    async.any =
    async.some = _createTester(async.eachOf, toBool, identity);

    async.someLimit = _createTester(async.eachOfLimit, toBool, identity);

    async.all =
    async.every = _createTester(async.eachOf, notId, notId);

    async.everyLimit = _createTester(async.eachOfLimit, notId, notId);

    function _findGetResult(v, x) {
        return x;
    }
    async.detect = _createTester(async.eachOf, identity, _findGetResult);
    async.detectSeries = _createTester(async.eachOfSeries, identity, _findGetResult);
    async.detectLimit = _createTester(async.eachOfLimit, identity, _findGetResult);

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                callback(null, _map(results.sort(comparator), function (x) {
                    return x.value;
                }));
            }

        });

        function comparator(left, right) {
            var a = left.criteria, b = right.criteria;
            return a < b ? -1 : a > b ? 1 : 0;
        }
    };

    async.auto = function (tasks, concurrency, callback) {
        if (typeof arguments[1] === 'function') {
            // concurrency is optional, shift the args.
            callback = concurrency;
            concurrency = null;
        }
        callback = _once(callback || noop);
        var keys = _keys(tasks);
        var remainingTasks = keys.length;
        if (!remainingTasks) {
            return callback(null);
        }
        if (!concurrency) {
            concurrency = remainingTasks;
        }

        var results = {};
        var runningTasks = 0;

        var hasError = false;

        var listeners = [];
        function addListener(fn) {
            listeners.unshift(fn);
        }
        function removeListener(fn) {
            var idx = _indexOf(listeners, fn);
            if (idx >= 0) listeners.splice(idx, 1);
        }
        function taskComplete() {
            remainingTasks--;
            _arrayEach(listeners.slice(0), function (fn) {
                fn();
            });
        }

        addListener(function () {
            if (!remainingTasks) {
                callback(null, results);
            }
        });

        _arrayEach(keys, function (k) {
            if (hasError) return;
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = _restParam(function(err, args) {
                runningTasks--;
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _forEachOf(results, function(val, rkey) {
                        safeResults[rkey] = val;
                    });
                    safeResults[k] = args;
                    hasError = true;

                    callback(err, safeResults);
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            });
            var requires = task.slice(0, task.length - 1);
            // prevent dead-locks
            var len = requires.length;
            var dep;
            while (len--) {
                if (!(dep = tasks[requires[len]])) {
                    throw new Error('Has nonexistent dependency in ' + requires.join(', '));
                }
                if (_isArray(dep) && _indexOf(dep, k) >= 0) {
                    throw new Error('Has cyclic dependencies');
                }
            }
            function ready() {
                return runningTasks < concurrency && _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            }
            if (ready()) {
                runningTasks++;
                task[task.length - 1](taskCallback, results);
            }
            else {
                addListener(listener);
            }
            function listener() {
                if (ready()) {
                    runningTasks++;
                    removeListener(listener);
                    task[task.length - 1](taskCallback, results);
                }
            }
        });
    };



    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var DEFAULT_INTERVAL = 0;

        var attempts = [];

        var opts = {
            times: DEFAULT_TIMES,
            interval: DEFAULT_INTERVAL
        };

        function parseTimes(acc, t){
            if(typeof t === 'number'){
                acc.times = parseInt(t, 10) || DEFAULT_TIMES;
            } else if(typeof t === 'object'){
                acc.times = parseInt(t.times, 10) || DEFAULT_TIMES;
                acc.interval = parseInt(t.interval, 10) || DEFAULT_INTERVAL;
            } else {
                throw new Error('Unsupported argument type for \'times\': ' + typeof t);
            }
        }

        var length = arguments.length;
        if (length < 1 || length > 3) {
            throw new Error('Invalid arguments - must be either (task), (task, callback), (times, task) or (times, task, callback)');
        } else if (length <= 2 && typeof times === 'function') {
            callback = task;
            task = times;
        }
        if (typeof times !== 'function') {
            parseTimes(opts, times);
        }
        opts.callback = callback;
        opts.task = task;

        function wrappedTask(wrappedCallback, wrappedResults) {
            function retryAttempt(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            }

            function retryInterval(interval){
                return function(seriesCallback){
                    setTimeout(function(){
                        seriesCallback(null);
                    }, interval);
                };
            }

            while (opts.times) {

                var finalAttempt = !(opts.times-=1);
                attempts.push(retryAttempt(opts.task, finalAttempt));
                if(!finalAttempt && opts.interval > 0){
                    attempts.push(retryInterval(opts.interval));
                }
            }

            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || opts.callback)(data.err, data.result);
            });
        }

        // If a callback is passed, run this as a controll flow
        return opts.callback ? wrappedTask() : wrappedTask;
    };

    async.waterfall = function (tasks, callback) {
        callback = _once(callback || noop);
        if (!_isArray(tasks)) {
            var err = new Error('First argument to waterfall must be an array of functions');
            return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        function wrapIterator(iterator) {
            return _restParam(function (err, args) {
                if (err) {
                    callback.apply(null, [err].concat(args));
                }
                else {
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    ensureAsync(iterator).apply(null, args);
                }
            });
        }
        wrapIterator(async.iterator(tasks))();
    };

    function _parallel(eachfn, tasks, callback) {
        callback = callback || noop;
        var results = _isArrayLike(tasks) ? [] : {};

        eachfn(tasks, function (task, key, callback) {
            task(_restParam(function (err, args) {
                if (args.length <= 1) {
                    args = args[0];
                }
                results[key] = args;
                callback(err);
            }));
        }, function (err) {
            callback(err, results);
        });
    }

    async.parallel = function (tasks, callback) {
        _parallel(async.eachOf, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel(_eachOfLimit(limit), tasks, callback);
    };

    async.series = function(tasks, callback) {
        _parallel(async.eachOfSeries, tasks, callback);
    };

    async.iterator = function (tasks) {
        function makeCallback(index) {
            function fn() {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            }
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        }
        return makeCallback(0);
    };

    async.apply = _restParam(function (fn, args) {
        return _restParam(function (callArgs) {
            return fn.apply(
                null, args.concat(callArgs)
            );
        });
    });

    function _concat(eachfn, arr, fn, callback) {
        var result = [];
        eachfn(arr, function (x, index, cb) {
            fn(x, function (err, y) {
                result = result.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, result);
        });
    }
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        callback = callback || noop;
        if (test()) {
            var next = _restParam(function(err, args) {
                if (err) {
                    callback(err);
                } else if (test.apply(this, args)) {
                    iterator(next);
                } else {
                    callback.apply(null, [null].concat(args));
                }
            });
            iterator(next);
        } else {
            callback(null);
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        var calls = 0;
        return async.whilst(function() {
            return ++calls <= 1 || test.apply(this, arguments);
        }, iterator, callback);
    };

    async.until = function (test, iterator, callback) {
        return async.whilst(function() {
            return !test.apply(this, arguments);
        }, iterator, callback);
    };

    async.doUntil = function (iterator, test, callback) {
        return async.doWhilst(iterator, function() {
            return !test.apply(this, arguments);
        }, callback);
    };

    async.during = function (test, iterator, callback) {
        callback = callback || noop;

        var next = _restParam(function(err, args) {
            if (err) {
                callback(err);
            } else {
                args.push(check);
                test.apply(this, args);
            }
        });

        var check = function(err, truth) {
            if (err) {
                callback(err);
            } else if (truth) {
                iterator(next);
            } else {
                callback(null);
            }
        };

        test(check);
    };

    async.doDuring = function (iterator, test, callback) {
        var calls = 0;
        async.during(function(next) {
            if (calls++ < 1) {
                next(null, true);
            } else {
                test.apply(this, arguments);
            }
        }, iterator, callback);
    };

    function _queue(worker, concurrency, payload) {
        if (concurrency == null) {
            concurrency = 1;
        }
        else if(concurrency === 0) {
            throw new Error('Concurrency must not be zero');
        }
        function _insert(q, data, pos, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0 && q.idle()) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    callback: callback || noop
                };

                if (pos) {
                    q.tasks.unshift(item);
                } else {
                    q.tasks.push(item);
                }

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
            });
            async.setImmediate(q.process);
        }
        function _next(q, tasks) {
            return function(){
                workers -= 1;

                var removed = false;
                var args = arguments;
                _arrayEach(tasks, function (task) {
                    _arrayEach(workersList, function (worker, index) {
                        if (worker === task && !removed) {
                            workersList.splice(index, 1);
                            removed = true;
                        }
                    });

                    task.callback.apply(task, args);
                });
                if (q.tasks.length + workers === 0) {
                    q.drain();
                }
                q.process();
            };
        }

        var workers = 0;
        var workersList = [];
        var q = {
            tasks: [],
            concurrency: concurrency,
            payload: payload,
            saturated: noop,
            empty: noop,
            drain: noop,
            started: false,
            paused: false,
            push: function (data, callback) {
                _insert(q, data, false, callback);
            },
            kill: function () {
                q.drain = noop;
                q.tasks = [];
            },
            unshift: function (data, callback) {
                _insert(q, data, true, callback);
            },
            process: function () {
                while(!q.paused && workers < q.concurrency && q.tasks.length){

                    var tasks = q.payload ?
                        q.tasks.splice(0, q.payload) :
                        q.tasks.splice(0, q.tasks.length);

                    var data = _map(tasks, function (task) {
                        return task.data;
                    });

                    if (q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    workersList.push(tasks[0]);
                    var cb = only_once(_next(q, tasks));
                    worker(data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            workersList: function () {
                return workersList;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                q.paused = true;
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                var resumeCount = Math.min(q.concurrency, q.tasks.length);
                // Need to call q.process once per concurrent
                // worker to preserve full concurrency after pause
                for (var w = 1; w <= resumeCount; w++) {
                    async.setImmediate(q.process);
                }
            }
        };
        return q;
    }

    async.queue = function (worker, concurrency) {
        var q = _queue(function (items, cb) {
            worker(items[0], cb);
        }, concurrency, 1);

        return q;
    };

    async.priorityQueue = function (worker, concurrency) {

        function _compareTasks(a, b){
            return a.priority - b.priority;
        }

        function _binarySearch(sequence, item, compare) {
            var beg = -1,
                end = sequence.length - 1;
            while (beg < end) {
                var mid = beg + ((end - beg + 1) >>> 1);
                if (compare(item, sequence[mid]) >= 0) {
                    beg = mid;
                } else {
                    end = mid - 1;
                }
            }
            return beg;
        }

        function _insert(q, data, priority, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    priority: priority,
                    callback: typeof callback === 'function' ? callback : noop
                };

                q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
                async.setImmediate(q.process);
            });
        }

        // Start with a normal queue
        var q = async.queue(worker, concurrency);

        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
            _insert(q, data, priority, callback);
        };

        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        return _queue(worker, 1, payload);
    };

    function _console_fn(name) {
        return _restParam(function (fn, args) {
            fn.apply(null, args.concat([_restParam(function (err, args) {
                if (typeof console === 'object') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _arrayEach(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            })]));
        });
    }
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        var has = Object.prototype.hasOwnProperty;
        hasher = hasher || identity;
        var memoized = _restParam(function memoized(args) {
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (has.call(memo, key)) {   
                async.setImmediate(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (has.call(queues, key)) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([_restParam(function (args) {
                    memo[key] = args;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                        q[i].apply(null, args);
                    }
                })]));
            }
        });
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
        return function () {
            return (fn.unmemoized || fn).apply(null, arguments);
        };
    };

    function _times(mapper) {
        return function (count, iterator, callback) {
            mapper(_range(count), iterator, callback);
        };
    }

    async.times = _times(async.map);
    async.timesSeries = _times(async.mapSeries);
    async.timesLimit = function (count, limit, iterator, callback) {
        return async.mapLimit(_range(count), limit, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return _restParam(function (args) {
            var that = this;

            var callback = args[args.length - 1];
            if (typeof callback == 'function') {
                args.pop();
            } else {
                callback = noop;
            }

            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([_restParam(function (err, nextargs) {
                    cb(err, nextargs);
                })]));
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        });
    };

    async.compose = function (/* functions... */) {
        return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };


    function _applyEach(eachfn) {
        return _restParam(function(fns, args) {
            var go = _restParam(function(args) {
                var that = this;
                var callback = args.pop();
                return eachfn(fns, function (fn, _, cb) {
                    fn.apply(that, args.concat([cb]));
                },
                callback);
            });
            if (args.length) {
                return go.apply(this, args);
            }
            else {
                return go;
            }
        });
    }

    async.applyEach = _applyEach(async.eachOf);
    async.applyEachSeries = _applyEach(async.eachOfSeries);


    async.forever = function (fn, callback) {
        var done = only_once(callback || noop);
        var task = ensureAsync(fn);
        function next(err) {
            if (err) {
                return done(err);
            }
            task(next);
        }
        next();
    };

    function ensureAsync(fn) {
        return _restParam(function (args) {
            var callback = args.pop();
            args.push(function () {
                var innerArgs = arguments;
                if (sync) {
                    async.setImmediate(function () {
                        callback.apply(null, innerArgs);
                    });
                } else {
                    callback.apply(null, innerArgs);
                }
            });
            var sync = true;
            fn.apply(this, args);
            sync = false;
        });
    }

    async.ensureAsync = ensureAsync;

    async.constant = _restParam(function(values) {
        var args = [null].concat(values);
        return function (callback) {
            return callback.apply(this, args);
        };
    });

    async.wrapSync =
    async.asyncify = function asyncify(func) {
        return _restParam(function (args) {
            var callback = args.pop();
            var result;
            try {
                result = func.apply(this, args);
            } catch (e) {
                return callback(e);
            }
            // if result is Promise object
            if (_isObject(result) && typeof result.then === "function") {
                result.then(function(value) {
                    callback(null, value);
                })["catch"](function(err) {
                    callback(err.message ? err : new Error(err));
                });
            } else {
                callback(null, result);
            }
        });
    };

    // Node.js
    if (typeof module === 'object' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define === 'function' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":3}],2:[function(require,module,exports){
module.exports = function blacklist (src) {
  var copy = {}, filter = arguments[1]

  if (typeof filter === 'string') {
    filter = {}
    for (var i = 1; i < arguments.length; i++) {
      filter[arguments[i]] = true
    }
  }

  for (var key in src) {
    // blacklist?
    if (filter[key]) continue

    copy[key] = src[key]
  }

  return copy
}

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
/*!
  Copyright (c) 2016 Jed Watson.
  Licensed under the MIT License (MIT), see
  http://jedwatson.github.io/classnames
*/
/* global define */

(function () {
	'use strict';

	var hasOwn = {}.hasOwnProperty;

	function classNames () {
		var classes = [];

		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (!arg) continue;

			var argType = typeof arg;

			if (argType === 'string' || argType === 'number') {
				classes.push(arg);
			} else if (Array.isArray(arg)) {
				classes.push(classNames.apply(null, arg));
			} else if (argType === 'object') {
				for (var key in arg) {
					if (hasOwn.call(arg, key) && arg[key]) {
						classes.push(key);
					}
				}
			}
		}

		return classes.join(' ');
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = classNames;
	} else if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
		// register as 'classnames', consistent with npm package name
		define('classnames', [], function () {
			return classNames;
		});
	} else {
		window.classNames = classNames;
	}
}());

},{}],5:[function(require,module,exports){
!function() {
  var d3 = {
    version: "3.5.16"
  };
  var d3_arraySlice = [].slice, d3_array = function(list) {
    return d3_arraySlice.call(list);
  };
  var d3_document = this.document;
  function d3_documentElement(node) {
    return node && (node.ownerDocument || node.document || node).documentElement;
  }
  function d3_window(node) {
    return node && (node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView);
  }
  if (d3_document) {
    try {
      d3_array(d3_document.documentElement.childNodes)[0].nodeType;
    } catch (e) {
      d3_array = function(list) {
        var i = list.length, array = new Array(i);
        while (i--) array[i] = list[i];
        return array;
      };
    }
  }
  if (!Date.now) Date.now = function() {
    return +new Date();
  };
  if (d3_document) {
    try {
      d3_document.createElement("DIV").style.setProperty("opacity", 0, "");
    } catch (error) {
      var d3_element_prototype = this.Element.prototype, d3_element_setAttribute = d3_element_prototype.setAttribute, d3_element_setAttributeNS = d3_element_prototype.setAttributeNS, d3_style_prototype = this.CSSStyleDeclaration.prototype, d3_style_setProperty = d3_style_prototype.setProperty;
      d3_element_prototype.setAttribute = function(name, value) {
        d3_element_setAttribute.call(this, name, value + "");
      };
      d3_element_prototype.setAttributeNS = function(space, local, value) {
        d3_element_setAttributeNS.call(this, space, local, value + "");
      };
      d3_style_prototype.setProperty = function(name, value, priority) {
        d3_style_setProperty.call(this, name, value + "", priority);
      };
    }
  }
  d3.ascending = d3_ascending;
  function d3_ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }
  d3.descending = function(a, b) {
    return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
  };
  d3.min = function(array, f) {
    var i = -1, n = array.length, a, b;
    if (arguments.length === 1) {
      while (++i < n) if ((b = array[i]) != null && b >= b) {
        a = b;
        break;
      }
      while (++i < n) if ((b = array[i]) != null && a > b) a = b;
    } else {
      while (++i < n) if ((b = f.call(array, array[i], i)) != null && b >= b) {
        a = b;
        break;
      }
      while (++i < n) if ((b = f.call(array, array[i], i)) != null && a > b) a = b;
    }
    return a;
  };
  d3.max = function(array, f) {
    var i = -1, n = array.length, a, b;
    if (arguments.length === 1) {
      while (++i < n) if ((b = array[i]) != null && b >= b) {
        a = b;
        break;
      }
      while (++i < n) if ((b = array[i]) != null && b > a) a = b;
    } else {
      while (++i < n) if ((b = f.call(array, array[i], i)) != null && b >= b) {
        a = b;
        break;
      }
      while (++i < n) if ((b = f.call(array, array[i], i)) != null && b > a) a = b;
    }
    return a;
  };
  d3.extent = function(array, f) {
    var i = -1, n = array.length, a, b, c;
    if (arguments.length === 1) {
      while (++i < n) if ((b = array[i]) != null && b >= b) {
        a = c = b;
        break;
      }
      while (++i < n) if ((b = array[i]) != null) {
        if (a > b) a = b;
        if (c < b) c = b;
      }
    } else {
      while (++i < n) if ((b = f.call(array, array[i], i)) != null && b >= b) {
        a = c = b;
        break;
      }
      while (++i < n) if ((b = f.call(array, array[i], i)) != null) {
        if (a > b) a = b;
        if (c < b) c = b;
      }
    }
    return [ a, c ];
  };
  function d3_number(x) {
    return x === null ? NaN : +x;
  }
  function d3_numeric(x) {
    return !isNaN(x);
  }
  d3.sum = function(array, f) {
    var s = 0, n = array.length, a, i = -1;
    if (arguments.length === 1) {
      while (++i < n) if (d3_numeric(a = +array[i])) s += a;
    } else {
      while (++i < n) if (d3_numeric(a = +f.call(array, array[i], i))) s += a;
    }
    return s;
  };
  d3.mean = function(array, f) {
    var s = 0, n = array.length, a, i = -1, j = n;
    if (arguments.length === 1) {
      while (++i < n) if (d3_numeric(a = d3_number(array[i]))) s += a; else --j;
    } else {
      while (++i < n) if (d3_numeric(a = d3_number(f.call(array, array[i], i)))) s += a; else --j;
    }
    if (j) return s / j;
  };
  d3.quantile = function(values, p) {
    var H = (values.length - 1) * p + 1, h = Math.floor(H), v = +values[h - 1], e = H - h;
    return e ? v + e * (values[h] - v) : v;
  };
  d3.median = function(array, f) {
    var numbers = [], n = array.length, a, i = -1;
    if (arguments.length === 1) {
      while (++i < n) if (d3_numeric(a = d3_number(array[i]))) numbers.push(a);
    } else {
      while (++i < n) if (d3_numeric(a = d3_number(f.call(array, array[i], i)))) numbers.push(a);
    }
    if (numbers.length) return d3.quantile(numbers.sort(d3_ascending), .5);
  };
  d3.variance = function(array, f) {
    var n = array.length, m = 0, a, d, s = 0, i = -1, j = 0;
    if (arguments.length === 1) {
      while (++i < n) {
        if (d3_numeric(a = d3_number(array[i]))) {
          d = a - m;
          m += d / ++j;
          s += d * (a - m);
        }
      }
    } else {
      while (++i < n) {
        if (d3_numeric(a = d3_number(f.call(array, array[i], i)))) {
          d = a - m;
          m += d / ++j;
          s += d * (a - m);
        }
      }
    }
    if (j > 1) return s / (j - 1);
  };
  d3.deviation = function() {
    var v = d3.variance.apply(this, arguments);
    return v ? Math.sqrt(v) : v;
  };
  function d3_bisector(compare) {
    return {
      left: function(a, x, lo, hi) {
        if (arguments.length < 3) lo = 0;
        if (arguments.length < 4) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) < 0) lo = mid + 1; else hi = mid;
        }
        return lo;
      },
      right: function(a, x, lo, hi) {
        if (arguments.length < 3) lo = 0;
        if (arguments.length < 4) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) > 0) hi = mid; else lo = mid + 1;
        }
        return lo;
      }
    };
  }
  var d3_bisect = d3_bisector(d3_ascending);
  d3.bisectLeft = d3_bisect.left;
  d3.bisect = d3.bisectRight = d3_bisect.right;
  d3.bisector = function(f) {
    return d3_bisector(f.length === 1 ? function(d, x) {
      return d3_ascending(f(d), x);
    } : f);
  };
  d3.shuffle = function(array, i0, i1) {
    if ((m = arguments.length) < 3) {
      i1 = array.length;
      if (m < 2) i0 = 0;
    }
    var m = i1 - i0, t, i;
    while (m) {
      i = Math.random() * m-- | 0;
      t = array[m + i0], array[m + i0] = array[i + i0], array[i + i0] = t;
    }
    return array;
  };
  d3.permute = function(array, indexes) {
    var i = indexes.length, permutes = new Array(i);
    while (i--) permutes[i] = array[indexes[i]];
    return permutes;
  };
  d3.pairs = function(array) {
    var i = 0, n = array.length - 1, p0, p1 = array[0], pairs = new Array(n < 0 ? 0 : n);
    while (i < n) pairs[i] = [ p0 = p1, p1 = array[++i] ];
    return pairs;
  };
  d3.transpose = function(matrix) {
    if (!(n = matrix.length)) return [];
    for (var i = -1, m = d3.min(matrix, d3_transposeLength), transpose = new Array(m); ++i < m; ) {
      for (var j = -1, n, row = transpose[i] = new Array(n); ++j < n; ) {
        row[j] = matrix[j][i];
      }
    }
    return transpose;
  };
  function d3_transposeLength(d) {
    return d.length;
  }
  d3.zip = function() {
    return d3.transpose(arguments);
  };
  d3.keys = function(map) {
    var keys = [];
    for (var key in map) keys.push(key);
    return keys;
  };
  d3.values = function(map) {
    var values = [];
    for (var key in map) values.push(map[key]);
    return values;
  };
  d3.entries = function(map) {
    var entries = [];
    for (var key in map) entries.push({
      key: key,
      value: map[key]
    });
    return entries;
  };
  d3.merge = function(arrays) {
    var n = arrays.length, m, i = -1, j = 0, merged, array;
    while (++i < n) j += arrays[i].length;
    merged = new Array(j);
    while (--n >= 0) {
      array = arrays[n];
      m = array.length;
      while (--m >= 0) {
        merged[--j] = array[m];
      }
    }
    return merged;
  };
  var abs = Math.abs;
  d3.range = function(start, stop, step) {
    if (arguments.length < 3) {
      step = 1;
      if (arguments.length < 2) {
        stop = start;
        start = 0;
      }
    }
    if ((stop - start) / step === Infinity) throw new Error("infinite range");
    var range = [], k = d3_range_integerScale(abs(step)), i = -1, j;
    start *= k, stop *= k, step *= k;
    if (step < 0) while ((j = start + step * ++i) > stop) range.push(j / k); else while ((j = start + step * ++i) < stop) range.push(j / k);
    return range;
  };
  function d3_range_integerScale(x) {
    var k = 1;
    while (x * k % 1) k *= 10;
    return k;
  }
  function d3_class(ctor, properties) {
    for (var key in properties) {
      Object.defineProperty(ctor.prototype, key, {
        value: properties[key],
        enumerable: false
      });
    }
  }
  d3.map = function(object, f) {
    var map = new d3_Map();
    if (object instanceof d3_Map) {
      object.forEach(function(key, value) {
        map.set(key, value);
      });
    } else if (Array.isArray(object)) {
      var i = -1, n = object.length, o;
      if (arguments.length === 1) while (++i < n) map.set(i, object[i]); else while (++i < n) map.set(f.call(object, o = object[i], i), o);
    } else {
      for (var key in object) map.set(key, object[key]);
    }
    return map;
  };
  function d3_Map() {
    this._ = Object.create(null);
  }
  var d3_map_proto = "__proto__", d3_map_zero = "\x00";
  d3_class(d3_Map, {
    has: d3_map_has,
    get: function(key) {
      return this._[d3_map_escape(key)];
    },
    set: function(key, value) {
      return this._[d3_map_escape(key)] = value;
    },
    remove: d3_map_remove,
    keys: d3_map_keys,
    values: function() {
      var values = [];
      for (var key in this._) values.push(this._[key]);
      return values;
    },
    entries: function() {
      var entries = [];
      for (var key in this._) entries.push({
        key: d3_map_unescape(key),
        value: this._[key]
      });
      return entries;
    },
    size: d3_map_size,
    empty: d3_map_empty,
    forEach: function(f) {
      for (var key in this._) f.call(this, d3_map_unescape(key), this._[key]);
    }
  });
  function d3_map_escape(key) {
    return (key += "") === d3_map_proto || key[0] === d3_map_zero ? d3_map_zero + key : key;
  }
  function d3_map_unescape(key) {
    return (key += "")[0] === d3_map_zero ? key.slice(1) : key;
  }
  function d3_map_has(key) {
    return d3_map_escape(key) in this._;
  }
  function d3_map_remove(key) {
    return (key = d3_map_escape(key)) in this._ && delete this._[key];
  }
  function d3_map_keys() {
    var keys = [];
    for (var key in this._) keys.push(d3_map_unescape(key));
    return keys;
  }
  function d3_map_size() {
    var size = 0;
    for (var key in this._) ++size;
    return size;
  }
  function d3_map_empty() {
    for (var key in this._) return false;
    return true;
  }
  d3.nest = function() {
    var nest = {}, keys = [], sortKeys = [], sortValues, rollup;
    function map(mapType, array, depth) {
      if (depth >= keys.length) return rollup ? rollup.call(nest, array) : sortValues ? array.sort(sortValues) : array;
      var i = -1, n = array.length, key = keys[depth++], keyValue, object, setter, valuesByKey = new d3_Map(), values;
      while (++i < n) {
        if (values = valuesByKey.get(keyValue = key(object = array[i]))) {
          values.push(object);
        } else {
          valuesByKey.set(keyValue, [ object ]);
        }
      }
      if (mapType) {
        object = mapType();
        setter = function(keyValue, values) {
          object.set(keyValue, map(mapType, values, depth));
        };
      } else {
        object = {};
        setter = function(keyValue, values) {
          object[keyValue] = map(mapType, values, depth);
        };
      }
      valuesByKey.forEach(setter);
      return object;
    }
    function entries(map, depth) {
      if (depth >= keys.length) return map;
      var array = [], sortKey = sortKeys[depth++];
      map.forEach(function(key, keyMap) {
        array.push({
          key: key,
          values: entries(keyMap, depth)
        });
      });
      return sortKey ? array.sort(function(a, b) {
        return sortKey(a.key, b.key);
      }) : array;
    }
    nest.map = function(array, mapType) {
      return map(mapType, array, 0);
    };
    nest.entries = function(array) {
      return entries(map(d3.map, array, 0), 0);
    };
    nest.key = function(d) {
      keys.push(d);
      return nest;
    };
    nest.sortKeys = function(order) {
      sortKeys[keys.length - 1] = order;
      return nest;
    };
    nest.sortValues = function(order) {
      sortValues = order;
      return nest;
    };
    nest.rollup = function(f) {
      rollup = f;
      return nest;
    };
    return nest;
  };
  d3.set = function(array) {
    var set = new d3_Set();
    if (array) for (var i = 0, n = array.length; i < n; ++i) set.add(array[i]);
    return set;
  };
  function d3_Set() {
    this._ = Object.create(null);
  }
  d3_class(d3_Set, {
    has: d3_map_has,
    add: function(key) {
      this._[d3_map_escape(key += "")] = true;
      return key;
    },
    remove: d3_map_remove,
    values: d3_map_keys,
    size: d3_map_size,
    empty: d3_map_empty,
    forEach: function(f) {
      for (var key in this._) f.call(this, d3_map_unescape(key));
    }
  });
  d3.behavior = {};
  function d3_identity(d) {
    return d;
  }
  d3.rebind = function(target, source) {
    var i = 1, n = arguments.length, method;
    while (++i < n) target[method = arguments[i]] = d3_rebind(target, source, source[method]);
    return target;
  };
  function d3_rebind(target, source, method) {
    return function() {
      var value = method.apply(source, arguments);
      return value === source ? target : value;
    };
  }
  function d3_vendorSymbol(object, name) {
    if (name in object) return name;
    name = name.charAt(0).toUpperCase() + name.slice(1);
    for (var i = 0, n = d3_vendorPrefixes.length; i < n; ++i) {
      var prefixName = d3_vendorPrefixes[i] + name;
      if (prefixName in object) return prefixName;
    }
  }
  var d3_vendorPrefixes = [ "webkit", "ms", "moz", "Moz", "o", "O" ];
  function d3_noop() {}
  d3.dispatch = function() {
    var dispatch = new d3_dispatch(), i = -1, n = arguments.length;
    while (++i < n) dispatch[arguments[i]] = d3_dispatch_event(dispatch);
    return dispatch;
  };
  function d3_dispatch() {}
  d3_dispatch.prototype.on = function(type, listener) {
    var i = type.indexOf("."), name = "";
    if (i >= 0) {
      name = type.slice(i + 1);
      type = type.slice(0, i);
    }
    if (type) return arguments.length < 2 ? this[type].on(name) : this[type].on(name, listener);
    if (arguments.length === 2) {
      if (listener == null) for (type in this) {
        if (this.hasOwnProperty(type)) this[type].on(name, null);
      }
      return this;
    }
  };
  function d3_dispatch_event(dispatch) {
    var listeners = [], listenerByName = new d3_Map();
    function event() {
      var z = listeners, i = -1, n = z.length, l;
      while (++i < n) if (l = z[i].on) l.apply(this, arguments);
      return dispatch;
    }
    event.on = function(name, listener) {
      var l = listenerByName.get(name), i;
      if (arguments.length < 2) return l && l.on;
      if (l) {
        l.on = null;
        listeners = listeners.slice(0, i = listeners.indexOf(l)).concat(listeners.slice(i + 1));
        listenerByName.remove(name);
      }
      if (listener) listeners.push(listenerByName.set(name, {
        on: listener
      }));
      return dispatch;
    };
    return event;
  }
  d3.event = null;
  function d3_eventPreventDefault() {
    d3.event.preventDefault();
  }
  function d3_eventSource() {
    var e = d3.event, s;
    while (s = e.sourceEvent) e = s;
    return e;
  }
  function d3_eventDispatch(target) {
    var dispatch = new d3_dispatch(), i = 0, n = arguments.length;
    while (++i < n) dispatch[arguments[i]] = d3_dispatch_event(dispatch);
    dispatch.of = function(thiz, argumentz) {
      return function(e1) {
        try {
          var e0 = e1.sourceEvent = d3.event;
          e1.target = target;
          d3.event = e1;
          dispatch[e1.type].apply(thiz, argumentz);
        } finally {
          d3.event = e0;
        }
      };
    };
    return dispatch;
  }
  d3.requote = function(s) {
    return s.replace(d3_requote_re, "\\$&");
  };
  var d3_requote_re = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;
  var d3_subclass = {}.__proto__ ? function(object, prototype) {
    object.__proto__ = prototype;
  } : function(object, prototype) {
    for (var property in prototype) object[property] = prototype[property];
  };
  function d3_selection(groups) {
    d3_subclass(groups, d3_selectionPrototype);
    return groups;
  }
  var d3_select = function(s, n) {
    return n.querySelector(s);
  }, d3_selectAll = function(s, n) {
    return n.querySelectorAll(s);
  }, d3_selectMatches = function(n, s) {
    var d3_selectMatcher = n.matches || n[d3_vendorSymbol(n, "matchesSelector")];
    d3_selectMatches = function(n, s) {
      return d3_selectMatcher.call(n, s);
    };
    return d3_selectMatches(n, s);
  };
  if (typeof Sizzle === "function") {
    d3_select = function(s, n) {
      return Sizzle(s, n)[0] || null;
    };
    d3_selectAll = Sizzle;
    d3_selectMatches = Sizzle.matchesSelector;
  }
  d3.selection = function() {
    return d3.select(d3_document.documentElement);
  };
  var d3_selectionPrototype = d3.selection.prototype = [];
  d3_selectionPrototype.select = function(selector) {
    var subgroups = [], subgroup, subnode, group, node;
    selector = d3_selection_selector(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      subgroups.push(subgroup = []);
      subgroup.parentNode = (group = this[j]).parentNode;
      for (var i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          subgroup.push(subnode = selector.call(node, node.__data__, i, j));
          if (subnode && "__data__" in node) subnode.__data__ = node.__data__;
        } else {
          subgroup.push(null);
        }
      }
    }
    return d3_selection(subgroups);
  };
  function d3_selection_selector(selector) {
    return typeof selector === "function" ? selector : function() {
      return d3_select(selector, this);
    };
  }
  d3_selectionPrototype.selectAll = function(selector) {
    var subgroups = [], subgroup, node;
    selector = d3_selection_selectorAll(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          subgroups.push(subgroup = d3_array(selector.call(node, node.__data__, i, j)));
          subgroup.parentNode = node;
        }
      }
    }
    return d3_selection(subgroups);
  };
  function d3_selection_selectorAll(selector) {
    return typeof selector === "function" ? selector : function() {
      return d3_selectAll(selector, this);
    };
  }
  var d3_nsXhtml = "http://www.w3.org/1999/xhtml";
  var d3_nsPrefix = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: d3_nsXhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };
  d3.ns = {
    prefix: d3_nsPrefix,
    qualify: function(name) {
      var i = name.indexOf(":"), prefix = name;
      if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
      return d3_nsPrefix.hasOwnProperty(prefix) ? {
        space: d3_nsPrefix[prefix],
        local: name
      } : name;
    }
  };
  d3_selectionPrototype.attr = function(name, value) {
    if (arguments.length < 2) {
      if (typeof name === "string") {
        var node = this.node();
        name = d3.ns.qualify(name);
        return name.local ? node.getAttributeNS(name.space, name.local) : node.getAttribute(name);
      }
      for (value in name) this.each(d3_selection_attr(value, name[value]));
      return this;
    }
    return this.each(d3_selection_attr(name, value));
  };
  function d3_selection_attr(name, value) {
    name = d3.ns.qualify(name);
    function attrNull() {
      this.removeAttribute(name);
    }
    function attrNullNS() {
      this.removeAttributeNS(name.space, name.local);
    }
    function attrConstant() {
      this.setAttribute(name, value);
    }
    function attrConstantNS() {
      this.setAttributeNS(name.space, name.local, value);
    }
    function attrFunction() {
      var x = value.apply(this, arguments);
      if (x == null) this.removeAttribute(name); else this.setAttribute(name, x);
    }
    function attrFunctionNS() {
      var x = value.apply(this, arguments);
      if (x == null) this.removeAttributeNS(name.space, name.local); else this.setAttributeNS(name.space, name.local, x);
    }
    return value == null ? name.local ? attrNullNS : attrNull : typeof value === "function" ? name.local ? attrFunctionNS : attrFunction : name.local ? attrConstantNS : attrConstant;
  }
  function d3_collapse(s) {
    return s.trim().replace(/\s+/g, " ");
  }
  d3_selectionPrototype.classed = function(name, value) {
    if (arguments.length < 2) {
      if (typeof name === "string") {
        var node = this.node(), n = (name = d3_selection_classes(name)).length, i = -1;
        if (value = node.classList) {
          while (++i < n) if (!value.contains(name[i])) return false;
        } else {
          value = node.getAttribute("class");
          while (++i < n) if (!d3_selection_classedRe(name[i]).test(value)) return false;
        }
        return true;
      }
      for (value in name) this.each(d3_selection_classed(value, name[value]));
      return this;
    }
    return this.each(d3_selection_classed(name, value));
  };
  function d3_selection_classedRe(name) {
    return new RegExp("(?:^|\\s+)" + d3.requote(name) + "(?:\\s+|$)", "g");
  }
  function d3_selection_classes(name) {
    return (name + "").trim().split(/^|\s+/);
  }
  function d3_selection_classed(name, value) {
    name = d3_selection_classes(name).map(d3_selection_classedName);
    var n = name.length;
    function classedConstant() {
      var i = -1;
      while (++i < n) name[i](this, value);
    }
    function classedFunction() {
      var i = -1, x = value.apply(this, arguments);
      while (++i < n) name[i](this, x);
    }
    return typeof value === "function" ? classedFunction : classedConstant;
  }
  function d3_selection_classedName(name) {
    var re = d3_selection_classedRe(name);
    return function(node, value) {
      if (c = node.classList) return value ? c.add(name) : c.remove(name);
      var c = node.getAttribute("class") || "";
      if (value) {
        re.lastIndex = 0;
        if (!re.test(c)) node.setAttribute("class", d3_collapse(c + " " + name));
      } else {
        node.setAttribute("class", d3_collapse(c.replace(re, " ")));
      }
    };
  }
  d3_selectionPrototype.style = function(name, value, priority) {
    var n = arguments.length;
    if (n < 3) {
      if (typeof name !== "string") {
        if (n < 2) value = "";
        for (priority in name) this.each(d3_selection_style(priority, name[priority], value));
        return this;
      }
      if (n < 2) {
        var node = this.node();
        return d3_window(node).getComputedStyle(node, null).getPropertyValue(name);
      }
      priority = "";
    }
    return this.each(d3_selection_style(name, value, priority));
  };
  function d3_selection_style(name, value, priority) {
    function styleNull() {
      this.style.removeProperty(name);
    }
    function styleConstant() {
      this.style.setProperty(name, value, priority);
    }
    function styleFunction() {
      var x = value.apply(this, arguments);
      if (x == null) this.style.removeProperty(name); else this.style.setProperty(name, x, priority);
    }
    return value == null ? styleNull : typeof value === "function" ? styleFunction : styleConstant;
  }
  d3_selectionPrototype.property = function(name, value) {
    if (arguments.length < 2) {
      if (typeof name === "string") return this.node()[name];
      for (value in name) this.each(d3_selection_property(value, name[value]));
      return this;
    }
    return this.each(d3_selection_property(name, value));
  };
  function d3_selection_property(name, value) {
    function propertyNull() {
      delete this[name];
    }
    function propertyConstant() {
      this[name] = value;
    }
    function propertyFunction() {
      var x = value.apply(this, arguments);
      if (x == null) delete this[name]; else this[name] = x;
    }
    return value == null ? propertyNull : typeof value === "function" ? propertyFunction : propertyConstant;
  }
  d3_selectionPrototype.text = function(value) {
    return arguments.length ? this.each(typeof value === "function" ? function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    } : value == null ? function() {
      this.textContent = "";
    } : function() {
      this.textContent = value;
    }) : this.node().textContent;
  };
  d3_selectionPrototype.html = function(value) {
    return arguments.length ? this.each(typeof value === "function" ? function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    } : value == null ? function() {
      this.innerHTML = "";
    } : function() {
      this.innerHTML = value;
    }) : this.node().innerHTML;
  };
  d3_selectionPrototype.append = function(name) {
    name = d3_selection_creator(name);
    return this.select(function() {
      return this.appendChild(name.apply(this, arguments));
    });
  };
  function d3_selection_creator(name) {
    function create() {
      var document = this.ownerDocument, namespace = this.namespaceURI;
      return namespace === d3_nsXhtml && document.documentElement.namespaceURI === d3_nsXhtml ? document.createElement(name) : document.createElementNS(namespace, name);
    }
    function createNS() {
      return this.ownerDocument.createElementNS(name.space, name.local);
    }
    return typeof name === "function" ? name : (name = d3.ns.qualify(name)).local ? createNS : create;
  }
  d3_selectionPrototype.insert = function(name, before) {
    name = d3_selection_creator(name);
    before = d3_selection_selector(before);
    return this.select(function() {
      return this.insertBefore(name.apply(this, arguments), before.apply(this, arguments) || null);
    });
  };
  d3_selectionPrototype.remove = function() {
    return this.each(d3_selectionRemove);
  };
  function d3_selectionRemove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }
  d3_selectionPrototype.data = function(value, key) {
    var i = -1, n = this.length, group, node;
    if (!arguments.length) {
      value = new Array(n = (group = this[0]).length);
      while (++i < n) {
        if (node = group[i]) {
          value[i] = node.__data__;
        }
      }
      return value;
    }
    function bind(group, groupData) {
      var i, n = group.length, m = groupData.length, n0 = Math.min(n, m), updateNodes = new Array(m), enterNodes = new Array(m), exitNodes = new Array(n), node, nodeData;
      if (key) {
        var nodeByKeyValue = new d3_Map(), keyValues = new Array(n), keyValue;
        for (i = -1; ++i < n; ) {
          if (node = group[i]) {
            if (nodeByKeyValue.has(keyValue = key.call(node, node.__data__, i))) {
              exitNodes[i] = node;
            } else {
              nodeByKeyValue.set(keyValue, node);
            }
            keyValues[i] = keyValue;
          }
        }
        for (i = -1; ++i < m; ) {
          if (!(node = nodeByKeyValue.get(keyValue = key.call(groupData, nodeData = groupData[i], i)))) {
            enterNodes[i] = d3_selection_dataNode(nodeData);
          } else if (node !== true) {
            updateNodes[i] = node;
            node.__data__ = nodeData;
          }
          nodeByKeyValue.set(keyValue, true);
        }
        for (i = -1; ++i < n; ) {
          if (i in keyValues && nodeByKeyValue.get(keyValues[i]) !== true) {
            exitNodes[i] = group[i];
          }
        }
      } else {
        for (i = -1; ++i < n0; ) {
          node = group[i];
          nodeData = groupData[i];
          if (node) {
            node.__data__ = nodeData;
            updateNodes[i] = node;
          } else {
            enterNodes[i] = d3_selection_dataNode(nodeData);
          }
        }
        for (;i < m; ++i) {
          enterNodes[i] = d3_selection_dataNode(groupData[i]);
        }
        for (;i < n; ++i) {
          exitNodes[i] = group[i];
        }
      }
      enterNodes.update = updateNodes;
      enterNodes.parentNode = updateNodes.parentNode = exitNodes.parentNode = group.parentNode;
      enter.push(enterNodes);
      update.push(updateNodes);
      exit.push(exitNodes);
    }
    var enter = d3_selection_enter([]), update = d3_selection([]), exit = d3_selection([]);
    if (typeof value === "function") {
      while (++i < n) {
        bind(group = this[i], value.call(group, group.parentNode.__data__, i));
      }
    } else {
      while (++i < n) {
        bind(group = this[i], value);
      }
    }
    update.enter = function() {
      return enter;
    };
    update.exit = function() {
      return exit;
    };
    return update;
  };
  function d3_selection_dataNode(data) {
    return {
      __data__: data
    };
  }
  d3_selectionPrototype.datum = function(value) {
    return arguments.length ? this.property("__data__", value) : this.property("__data__");
  };
  d3_selectionPrototype.filter = function(filter) {
    var subgroups = [], subgroup, group, node;
    if (typeof filter !== "function") filter = d3_selection_filter(filter);
    for (var j = 0, m = this.length; j < m; j++) {
      subgroups.push(subgroup = []);
      subgroup.parentNode = (group = this[j]).parentNode;
      for (var i = 0, n = group.length; i < n; i++) {
        if ((node = group[i]) && filter.call(node, node.__data__, i, j)) {
          subgroup.push(node);
        }
      }
    }
    return d3_selection(subgroups);
  };
  function d3_selection_filter(selector) {
    return function() {
      return d3_selectMatches(this, selector);
    };
  }
  d3_selectionPrototype.order = function() {
    for (var j = -1, m = this.length; ++j < m; ) {
      for (var group = this[j], i = group.length - 1, next = group[i], node; --i >= 0; ) {
        if (node = group[i]) {
          if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }
    return this;
  };
  d3_selectionPrototype.sort = function(comparator) {
    comparator = d3_selection_sortComparator.apply(this, arguments);
    for (var j = -1, m = this.length; ++j < m; ) this[j].sort(comparator);
    return this.order();
  };
  function d3_selection_sortComparator(comparator) {
    if (!arguments.length) comparator = d3_ascending;
    return function(a, b) {
      return a && b ? comparator(a.__data__, b.__data__) : !a - !b;
    };
  }
  d3_selectionPrototype.each = function(callback) {
    return d3_selection_each(this, function(node, i, j) {
      callback.call(node, node.__data__, i, j);
    });
  };
  function d3_selection_each(groups, callback) {
    for (var j = 0, m = groups.length; j < m; j++) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; i++) {
        if (node = group[i]) callback(node, i, j);
      }
    }
    return groups;
  }
  d3_selectionPrototype.call = function(callback) {
    var args = d3_array(arguments);
    callback.apply(args[0] = this, args);
    return this;
  };
  d3_selectionPrototype.empty = function() {
    return !this.node();
  };
  d3_selectionPrototype.node = function() {
    for (var j = 0, m = this.length; j < m; j++) {
      for (var group = this[j], i = 0, n = group.length; i < n; i++) {
        var node = group[i];
        if (node) return node;
      }
    }
    return null;
  };
  d3_selectionPrototype.size = function() {
    var n = 0;
    d3_selection_each(this, function() {
      ++n;
    });
    return n;
  };
  function d3_selection_enter(selection) {
    d3_subclass(selection, d3_selection_enterPrototype);
    return selection;
  }
  var d3_selection_enterPrototype = [];
  d3.selection.enter = d3_selection_enter;
  d3.selection.enter.prototype = d3_selection_enterPrototype;
  d3_selection_enterPrototype.append = d3_selectionPrototype.append;
  d3_selection_enterPrototype.empty = d3_selectionPrototype.empty;
  d3_selection_enterPrototype.node = d3_selectionPrototype.node;
  d3_selection_enterPrototype.call = d3_selectionPrototype.call;
  d3_selection_enterPrototype.size = d3_selectionPrototype.size;
  d3_selection_enterPrototype.select = function(selector) {
    var subgroups = [], subgroup, subnode, upgroup, group, node;
    for (var j = -1, m = this.length; ++j < m; ) {
      upgroup = (group = this[j]).update;
      subgroups.push(subgroup = []);
      subgroup.parentNode = group.parentNode;
      for (var i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          subgroup.push(upgroup[i] = subnode = selector.call(group.parentNode, node.__data__, i, j));
          subnode.__data__ = node.__data__;
        } else {
          subgroup.push(null);
        }
      }
    }
    return d3_selection(subgroups);
  };
  d3_selection_enterPrototype.insert = function(name, before) {
    if (arguments.length < 2) before = d3_selection_enterInsertBefore(this);
    return d3_selectionPrototype.insert.call(this, name, before);
  };
  function d3_selection_enterInsertBefore(enter) {
    var i0, j0;
    return function(d, i, j) {
      var group = enter[j].update, n = group.length, node;
      if (j != j0) j0 = j, i0 = 0;
      if (i >= i0) i0 = i + 1;
      while (!(node = group[i0]) && ++i0 < n) ;
      return node;
    };
  }
  d3.select = function(node) {
    var group;
    if (typeof node === "string") {
      group = [ d3_select(node, d3_document) ];
      group.parentNode = d3_document.documentElement;
    } else {
      group = [ node ];
      group.parentNode = d3_documentElement(node);
    }
    return d3_selection([ group ]);
  };
  d3.selectAll = function(nodes) {
    var group;
    if (typeof nodes === "string") {
      group = d3_array(d3_selectAll(nodes, d3_document));
      group.parentNode = d3_document.documentElement;
    } else {
      group = d3_array(nodes);
      group.parentNode = null;
    }
    return d3_selection([ group ]);
  };
  d3_selectionPrototype.on = function(type, listener, capture) {
    var n = arguments.length;
    if (n < 3) {
      if (typeof type !== "string") {
        if (n < 2) listener = false;
        for (capture in type) this.each(d3_selection_on(capture, type[capture], listener));
        return this;
      }
      if (n < 2) return (n = this.node()["__on" + type]) && n._;
      capture = false;
    }
    return this.each(d3_selection_on(type, listener, capture));
  };
  function d3_selection_on(type, listener, capture) {
    var name = "__on" + type, i = type.indexOf("."), wrap = d3_selection_onListener;
    if (i > 0) type = type.slice(0, i);
    var filter = d3_selection_onFilters.get(type);
    if (filter) type = filter, wrap = d3_selection_onFilter;
    function onRemove() {
      var l = this[name];
      if (l) {
        this.removeEventListener(type, l, l.$);
        delete this[name];
      }
    }
    function onAdd() {
      var l = wrap(listener, d3_array(arguments));
      onRemove.call(this);
      this.addEventListener(type, this[name] = l, l.$ = capture);
      l._ = listener;
    }
    function removeAll() {
      var re = new RegExp("^__on([^.]+)" + d3.requote(type) + "$"), match;
      for (var name in this) {
        if (match = name.match(re)) {
          var l = this[name];
          this.removeEventListener(match[1], l, l.$);
          delete this[name];
        }
      }
    }
    return i ? listener ? onAdd : onRemove : listener ? d3_noop : removeAll;
  }
  var d3_selection_onFilters = d3.map({
    mouseenter: "mouseover",
    mouseleave: "mouseout"
  });
  if (d3_document) {
    d3_selection_onFilters.forEach(function(k) {
      if ("on" + k in d3_document) d3_selection_onFilters.remove(k);
    });
  }
  function d3_selection_onListener(listener, argumentz) {
    return function(e) {
      var o = d3.event;
      d3.event = e;
      argumentz[0] = this.__data__;
      try {
        listener.apply(this, argumentz);
      } finally {
        d3.event = o;
      }
    };
  }
  function d3_selection_onFilter(listener, argumentz) {
    var l = d3_selection_onListener(listener, argumentz);
    return function(e) {
      var target = this, related = e.relatedTarget;
      if (!related || related !== target && !(related.compareDocumentPosition(target) & 8)) {
        l.call(target, e);
      }
    };
  }
  var d3_event_dragSelect, d3_event_dragId = 0;
  function d3_event_dragSuppress(node) {
    var name = ".dragsuppress-" + ++d3_event_dragId, click = "click" + name, w = d3.select(d3_window(node)).on("touchmove" + name, d3_eventPreventDefault).on("dragstart" + name, d3_eventPreventDefault).on("selectstart" + name, d3_eventPreventDefault);
    if (d3_event_dragSelect == null) {
      d3_event_dragSelect = "onselectstart" in node ? false : d3_vendorSymbol(node.style, "userSelect");
    }
    if (d3_event_dragSelect) {
      var style = d3_documentElement(node).style, select = style[d3_event_dragSelect];
      style[d3_event_dragSelect] = "none";
    }
    return function(suppressClick) {
      w.on(name, null);
      if (d3_event_dragSelect) style[d3_event_dragSelect] = select;
      if (suppressClick) {
        var off = function() {
          w.on(click, null);
        };
        w.on(click, function() {
          d3_eventPreventDefault();
          off();
        }, true);
        setTimeout(off, 0);
      }
    };
  }
  d3.mouse = function(container) {
    return d3_mousePoint(container, d3_eventSource());
  };
  var d3_mouse_bug44083 = this.navigator && /WebKit/.test(this.navigator.userAgent) ? -1 : 0;
  function d3_mousePoint(container, e) {
    if (e.changedTouches) e = e.changedTouches[0];
    var svg = container.ownerSVGElement || container;
    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      if (d3_mouse_bug44083 < 0) {
        var window = d3_window(container);
        if (window.scrollX || window.scrollY) {
          svg = d3.select("body").append("svg").style({
            position: "absolute",
            top: 0,
            left: 0,
            margin: 0,
            padding: 0,
            border: "none"
          }, "important");
          var ctm = svg[0][0].getScreenCTM();
          d3_mouse_bug44083 = !(ctm.f || ctm.e);
          svg.remove();
        }
      }
      if (d3_mouse_bug44083) point.x = e.pageX, point.y = e.pageY; else point.x = e.clientX, 
      point.y = e.clientY;
      point = point.matrixTransform(container.getScreenCTM().inverse());
      return [ point.x, point.y ];
    }
    var rect = container.getBoundingClientRect();
    return [ e.clientX - rect.left - container.clientLeft, e.clientY - rect.top - container.clientTop ];
  }
  d3.touch = function(container, touches, identifier) {
    if (arguments.length < 3) identifier = touches, touches = d3_eventSource().changedTouches;
    if (touches) for (var i = 0, n = touches.length, touch; i < n; ++i) {
      if ((touch = touches[i]).identifier === identifier) {
        return d3_mousePoint(container, touch);
      }
    }
  };
  d3.behavior.drag = function() {
    var event = d3_eventDispatch(drag, "drag", "dragstart", "dragend"), origin = null, mousedown = dragstart(d3_noop, d3.mouse, d3_window, "mousemove", "mouseup"), touchstart = dragstart(d3_behavior_dragTouchId, d3.touch, d3_identity, "touchmove", "touchend");
    function drag() {
      this.on("mousedown.drag", mousedown).on("touchstart.drag", touchstart);
    }
    function dragstart(id, position, subject, move, end) {
      return function() {
        var that = this, target = d3.event.target.correspondingElement || d3.event.target, parent = that.parentNode, dispatch = event.of(that, arguments), dragged = 0, dragId = id(), dragName = ".drag" + (dragId == null ? "" : "-" + dragId), dragOffset, dragSubject = d3.select(subject(target)).on(move + dragName, moved).on(end + dragName, ended), dragRestore = d3_event_dragSuppress(target), position0 = position(parent, dragId);
        if (origin) {
          dragOffset = origin.apply(that, arguments);
          dragOffset = [ dragOffset.x - position0[0], dragOffset.y - position0[1] ];
        } else {
          dragOffset = [ 0, 0 ];
        }
        dispatch({
          type: "dragstart"
        });
        function moved() {
          var position1 = position(parent, dragId), dx, dy;
          if (!position1) return;
          dx = position1[0] - position0[0];
          dy = position1[1] - position0[1];
          dragged |= dx | dy;
          position0 = position1;
          dispatch({
            type: "drag",
            x: position1[0] + dragOffset[0],
            y: position1[1] + dragOffset[1],
            dx: dx,
            dy: dy
          });
        }
        function ended() {
          if (!position(parent, dragId)) return;
          dragSubject.on(move + dragName, null).on(end + dragName, null);
          dragRestore(dragged);
          dispatch({
            type: "dragend"
          });
        }
      };
    }
    drag.origin = function(x) {
      if (!arguments.length) return origin;
      origin = x;
      return drag;
    };
    return d3.rebind(drag, event, "on");
  };
  function d3_behavior_dragTouchId() {
    return d3.event.changedTouches[0].identifier;
  }
  d3.touches = function(container, touches) {
    if (arguments.length < 2) touches = d3_eventSource().touches;
    return touches ? d3_array(touches).map(function(touch) {
      var point = d3_mousePoint(container, touch);
      point.identifier = touch.identifier;
      return point;
    }) : [];
  };
  var ε = 1e-6, ε2 = ε * ε, π = Math.PI, τ = 2 * π, τε = τ - ε, halfπ = π / 2, d3_radians = π / 180, d3_degrees = 180 / π;
  function d3_sgn(x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
  }
  function d3_cross2d(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  }
  function d3_acos(x) {
    return x > 1 ? 0 : x < -1 ? π : Math.acos(x);
  }
  function d3_asin(x) {
    return x > 1 ? halfπ : x < -1 ? -halfπ : Math.asin(x);
  }
  function d3_sinh(x) {
    return ((x = Math.exp(x)) - 1 / x) / 2;
  }
  function d3_cosh(x) {
    return ((x = Math.exp(x)) + 1 / x) / 2;
  }
  function d3_tanh(x) {
    return ((x = Math.exp(2 * x)) - 1) / (x + 1);
  }
  function d3_haversin(x) {
    return (x = Math.sin(x / 2)) * x;
  }
  var ρ = Math.SQRT2, ρ2 = 2, ρ4 = 4;
  d3.interpolateZoom = function(p0, p1) {
    var ux0 = p0[0], uy0 = p0[1], w0 = p0[2], ux1 = p1[0], uy1 = p1[1], w1 = p1[2], dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy, i, S;
    if (d2 < ε2) {
      S = Math.log(w1 / w0) / ρ;
      i = function(t) {
        return [ ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(ρ * t * S) ];
      };
    } else {
      var d1 = Math.sqrt(d2), b0 = (w1 * w1 - w0 * w0 + ρ4 * d2) / (2 * w0 * ρ2 * d1), b1 = (w1 * w1 - w0 * w0 - ρ4 * d2) / (2 * w1 * ρ2 * d1), r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
      S = (r1 - r0) / ρ;
      i = function(t) {
        var s = t * S, coshr0 = d3_cosh(r0), u = w0 / (ρ2 * d1) * (coshr0 * d3_tanh(ρ * s + r0) - d3_sinh(r0));
        return [ ux0 + u * dx, uy0 + u * dy, w0 * coshr0 / d3_cosh(ρ * s + r0) ];
      };
    }
    i.duration = S * 1e3;
    return i;
  };
  d3.behavior.zoom = function() {
    var view = {
      x: 0,
      y: 0,
      k: 1
    }, translate0, center0, center, size = [ 960, 500 ], scaleExtent = d3_behavior_zoomInfinity, duration = 250, zooming = 0, mousedown = "mousedown.zoom", mousemove = "mousemove.zoom", mouseup = "mouseup.zoom", mousewheelTimer, touchstart = "touchstart.zoom", touchtime, event = d3_eventDispatch(zoom, "zoomstart", "zoom", "zoomend"), x0, x1, y0, y1;
    if (!d3_behavior_zoomWheel) {
      d3_behavior_zoomWheel = "onwheel" in d3_document ? (d3_behavior_zoomDelta = function() {
        return -d3.event.deltaY * (d3.event.deltaMode ? 120 : 1);
      }, "wheel") : "onmousewheel" in d3_document ? (d3_behavior_zoomDelta = function() {
        return d3.event.wheelDelta;
      }, "mousewheel") : (d3_behavior_zoomDelta = function() {
        return -d3.event.detail;
      }, "MozMousePixelScroll");
    }
    function zoom(g) {
      g.on(mousedown, mousedowned).on(d3_behavior_zoomWheel + ".zoom", mousewheeled).on("dblclick.zoom", dblclicked).on(touchstart, touchstarted);
    }
    zoom.event = function(g) {
      g.each(function() {
        var dispatch = event.of(this, arguments), view1 = view;
        if (d3_transitionInheritId) {
          d3.select(this).transition().each("start.zoom", function() {
            view = this.__chart__ || {
              x: 0,
              y: 0,
              k: 1
            };
            zoomstarted(dispatch);
          }).tween("zoom:zoom", function() {
            var dx = size[0], dy = size[1], cx = center0 ? center0[0] : dx / 2, cy = center0 ? center0[1] : dy / 2, i = d3.interpolateZoom([ (cx - view.x) / view.k, (cy - view.y) / view.k, dx / view.k ], [ (cx - view1.x) / view1.k, (cy - view1.y) / view1.k, dx / view1.k ]);
            return function(t) {
              var l = i(t), k = dx / l[2];
              this.__chart__ = view = {
                x: cx - l[0] * k,
                y: cy - l[1] * k,
                k: k
              };
              zoomed(dispatch);
            };
          }).each("interrupt.zoom", function() {
            zoomended(dispatch);
          }).each("end.zoom", function() {
            zoomended(dispatch);
          });
        } else {
          this.__chart__ = view;
          zoomstarted(dispatch);
          zoomed(dispatch);
          zoomended(dispatch);
        }
      });
    };
    zoom.translate = function(_) {
      if (!arguments.length) return [ view.x, view.y ];
      view = {
        x: +_[0],
        y: +_[1],
        k: view.k
      };
      rescale();
      return zoom;
    };
    zoom.scale = function(_) {
      if (!arguments.length) return view.k;
      view = {
        x: view.x,
        y: view.y,
        k: null
      };
      scaleTo(+_);
      rescale();
      return zoom;
    };
    zoom.scaleExtent = function(_) {
      if (!arguments.length) return scaleExtent;
      scaleExtent = _ == null ? d3_behavior_zoomInfinity : [ +_[0], +_[1] ];
      return zoom;
    };
    zoom.center = function(_) {
      if (!arguments.length) return center;
      center = _ && [ +_[0], +_[1] ];
      return zoom;
    };
    zoom.size = function(_) {
      if (!arguments.length) return size;
      size = _ && [ +_[0], +_[1] ];
      return zoom;
    };
    zoom.duration = function(_) {
      if (!arguments.length) return duration;
      duration = +_;
      return zoom;
    };
    zoom.x = function(z) {
      if (!arguments.length) return x1;
      x1 = z;
      x0 = z.copy();
      view = {
        x: 0,
        y: 0,
        k: 1
      };
      return zoom;
    };
    zoom.y = function(z) {
      if (!arguments.length) return y1;
      y1 = z;
      y0 = z.copy();
      view = {
        x: 0,
        y: 0,
        k: 1
      };
      return zoom;
    };
    function location(p) {
      return [ (p[0] - view.x) / view.k, (p[1] - view.y) / view.k ];
    }
    function point(l) {
      return [ l[0] * view.k + view.x, l[1] * view.k + view.y ];
    }
    function scaleTo(s) {
      view.k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], s));
    }
    function translateTo(p, l) {
      l = point(l);
      view.x += p[0] - l[0];
      view.y += p[1] - l[1];
    }
    function zoomTo(that, p, l, k) {
      that.__chart__ = {
        x: view.x,
        y: view.y,
        k: view.k
      };
      scaleTo(Math.pow(2, k));
      translateTo(center0 = p, l);
      that = d3.select(that);
      if (duration > 0) that = that.transition().duration(duration);
      that.call(zoom.event);
    }
    function rescale() {
      if (x1) x1.domain(x0.range().map(function(x) {
        return (x - view.x) / view.k;
      }).map(x0.invert));
      if (y1) y1.domain(y0.range().map(function(y) {
        return (y - view.y) / view.k;
      }).map(y0.invert));
    }
    function zoomstarted(dispatch) {
      if (!zooming++) dispatch({
        type: "zoomstart"
      });
    }
    function zoomed(dispatch) {
      rescale();
      dispatch({
        type: "zoom",
        scale: view.k,
        translate: [ view.x, view.y ]
      });
    }
    function zoomended(dispatch) {
      if (!--zooming) dispatch({
        type: "zoomend"
      }), center0 = null;
    }
    function mousedowned() {
      var that = this, dispatch = event.of(that, arguments), dragged = 0, subject = d3.select(d3_window(that)).on(mousemove, moved).on(mouseup, ended), location0 = location(d3.mouse(that)), dragRestore = d3_event_dragSuppress(that);
      d3_selection_interrupt.call(that);
      zoomstarted(dispatch);
      function moved() {
        dragged = 1;
        translateTo(d3.mouse(that), location0);
        zoomed(dispatch);
      }
      function ended() {
        subject.on(mousemove, null).on(mouseup, null);
        dragRestore(dragged);
        zoomended(dispatch);
      }
    }
    function touchstarted() {
      var that = this, dispatch = event.of(that, arguments), locations0 = {}, distance0 = 0, scale0, zoomName = ".zoom-" + d3.event.changedTouches[0].identifier, touchmove = "touchmove" + zoomName, touchend = "touchend" + zoomName, targets = [], subject = d3.select(that), dragRestore = d3_event_dragSuppress(that);
      started();
      zoomstarted(dispatch);
      subject.on(mousedown, null).on(touchstart, started);
      function relocate() {
        var touches = d3.touches(that);
        scale0 = view.k;
        touches.forEach(function(t) {
          if (t.identifier in locations0) locations0[t.identifier] = location(t);
        });
        return touches;
      }
      function started() {
        var target = d3.event.target;
        d3.select(target).on(touchmove, moved).on(touchend, ended);
        targets.push(target);
        var changed = d3.event.changedTouches;
        for (var i = 0, n = changed.length; i < n; ++i) {
          locations0[changed[i].identifier] = null;
        }
        var touches = relocate(), now = Date.now();
        if (touches.length === 1) {
          if (now - touchtime < 500) {
            var p = touches[0];
            zoomTo(that, p, locations0[p.identifier], Math.floor(Math.log(view.k) / Math.LN2) + 1);
            d3_eventPreventDefault();
          }
          touchtime = now;
        } else if (touches.length > 1) {
          var p = touches[0], q = touches[1], dx = p[0] - q[0], dy = p[1] - q[1];
          distance0 = dx * dx + dy * dy;
        }
      }
      function moved() {
        var touches = d3.touches(that), p0, l0, p1, l1;
        d3_selection_interrupt.call(that);
        for (var i = 0, n = touches.length; i < n; ++i, l1 = null) {
          p1 = touches[i];
          if (l1 = locations0[p1.identifier]) {
            if (l0) break;
            p0 = p1, l0 = l1;
          }
        }
        if (l1) {
          var distance1 = (distance1 = p1[0] - p0[0]) * distance1 + (distance1 = p1[1] - p0[1]) * distance1, scale1 = distance0 && Math.sqrt(distance1 / distance0);
          p0 = [ (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 ];
          l0 = [ (l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2 ];
          scaleTo(scale1 * scale0);
        }
        touchtime = null;
        translateTo(p0, l0);
        zoomed(dispatch);
      }
      function ended() {
        if (d3.event.touches.length) {
          var changed = d3.event.changedTouches;
          for (var i = 0, n = changed.length; i < n; ++i) {
            delete locations0[changed[i].identifier];
          }
          for (var identifier in locations0) {
            return void relocate();
          }
        }
        d3.selectAll(targets).on(zoomName, null);
        subject.on(mousedown, mousedowned).on(touchstart, touchstarted);
        dragRestore();
        zoomended(dispatch);
      }
    }
    function mousewheeled() {
      var dispatch = event.of(this, arguments);
      if (mousewheelTimer) clearTimeout(mousewheelTimer); else d3_selection_interrupt.call(this), 
      translate0 = location(center0 = center || d3.mouse(this)), zoomstarted(dispatch);
      mousewheelTimer = setTimeout(function() {
        mousewheelTimer = null;
        zoomended(dispatch);
      }, 50);
      d3_eventPreventDefault();
      scaleTo(Math.pow(2, d3_behavior_zoomDelta() * .002) * view.k);
      translateTo(center0, translate0);
      zoomed(dispatch);
    }
    function dblclicked() {
      var p = d3.mouse(this), k = Math.log(view.k) / Math.LN2;
      zoomTo(this, p, location(p), d3.event.shiftKey ? Math.ceil(k) - 1 : Math.floor(k) + 1);
    }
    return d3.rebind(zoom, event, "on");
  };
  var d3_behavior_zoomInfinity = [ 0, Infinity ], d3_behavior_zoomDelta, d3_behavior_zoomWheel;
  d3.color = d3_color;
  function d3_color() {}
  d3_color.prototype.toString = function() {
    return this.rgb() + "";
  };
  d3.hsl = d3_hsl;
  function d3_hsl(h, s, l) {
    return this instanceof d3_hsl ? void (this.h = +h, this.s = +s, this.l = +l) : arguments.length < 2 ? h instanceof d3_hsl ? new d3_hsl(h.h, h.s, h.l) : d3_rgb_parse("" + h, d3_rgb_hsl, d3_hsl) : new d3_hsl(h, s, l);
  }
  var d3_hslPrototype = d3_hsl.prototype = new d3_color();
  d3_hslPrototype.brighter = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    return new d3_hsl(this.h, this.s, this.l / k);
  };
  d3_hslPrototype.darker = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    return new d3_hsl(this.h, this.s, k * this.l);
  };
  d3_hslPrototype.rgb = function() {
    return d3_hsl_rgb(this.h, this.s, this.l);
  };
  function d3_hsl_rgb(h, s, l) {
    var m1, m2;
    h = isNaN(h) ? 0 : (h %= 360) < 0 ? h + 360 : h;
    s = isNaN(s) ? 0 : s < 0 ? 0 : s > 1 ? 1 : s;
    l = l < 0 ? 0 : l > 1 ? 1 : l;
    m2 = l <= .5 ? l * (1 + s) : l + s - l * s;
    m1 = 2 * l - m2;
    function v(h) {
      if (h > 360) h -= 360; else if (h < 0) h += 360;
      if (h < 60) return m1 + (m2 - m1) * h / 60;
      if (h < 180) return m2;
      if (h < 240) return m1 + (m2 - m1) * (240 - h) / 60;
      return m1;
    }
    function vv(h) {
      return Math.round(v(h) * 255);
    }
    return new d3_rgb(vv(h + 120), vv(h), vv(h - 120));
  }
  d3.hcl = d3_hcl;
  function d3_hcl(h, c, l) {
    return this instanceof d3_hcl ? void (this.h = +h, this.c = +c, this.l = +l) : arguments.length < 2 ? h instanceof d3_hcl ? new d3_hcl(h.h, h.c, h.l) : h instanceof d3_lab ? d3_lab_hcl(h.l, h.a, h.b) : d3_lab_hcl((h = d3_rgb_lab((h = d3.rgb(h)).r, h.g, h.b)).l, h.a, h.b) : new d3_hcl(h, c, l);
  }
  var d3_hclPrototype = d3_hcl.prototype = new d3_color();
  d3_hclPrototype.brighter = function(k) {
    return new d3_hcl(this.h, this.c, Math.min(100, this.l + d3_lab_K * (arguments.length ? k : 1)));
  };
  d3_hclPrototype.darker = function(k) {
    return new d3_hcl(this.h, this.c, Math.max(0, this.l - d3_lab_K * (arguments.length ? k : 1)));
  };
  d3_hclPrototype.rgb = function() {
    return d3_hcl_lab(this.h, this.c, this.l).rgb();
  };
  function d3_hcl_lab(h, c, l) {
    if (isNaN(h)) h = 0;
    if (isNaN(c)) c = 0;
    return new d3_lab(l, Math.cos(h *= d3_radians) * c, Math.sin(h) * c);
  }
  d3.lab = d3_lab;
  function d3_lab(l, a, b) {
    return this instanceof d3_lab ? void (this.l = +l, this.a = +a, this.b = +b) : arguments.length < 2 ? l instanceof d3_lab ? new d3_lab(l.l, l.a, l.b) : l instanceof d3_hcl ? d3_hcl_lab(l.h, l.c, l.l) : d3_rgb_lab((l = d3_rgb(l)).r, l.g, l.b) : new d3_lab(l, a, b);
  }
  var d3_lab_K = 18;
  var d3_lab_X = .95047, d3_lab_Y = 1, d3_lab_Z = 1.08883;
  var d3_labPrototype = d3_lab.prototype = new d3_color();
  d3_labPrototype.brighter = function(k) {
    return new d3_lab(Math.min(100, this.l + d3_lab_K * (arguments.length ? k : 1)), this.a, this.b);
  };
  d3_labPrototype.darker = function(k) {
    return new d3_lab(Math.max(0, this.l - d3_lab_K * (arguments.length ? k : 1)), this.a, this.b);
  };
  d3_labPrototype.rgb = function() {
    return d3_lab_rgb(this.l, this.a, this.b);
  };
  function d3_lab_rgb(l, a, b) {
    var y = (l + 16) / 116, x = y + a / 500, z = y - b / 200;
    x = d3_lab_xyz(x) * d3_lab_X;
    y = d3_lab_xyz(y) * d3_lab_Y;
    z = d3_lab_xyz(z) * d3_lab_Z;
    return new d3_rgb(d3_xyz_rgb(3.2404542 * x - 1.5371385 * y - .4985314 * z), d3_xyz_rgb(-.969266 * x + 1.8760108 * y + .041556 * z), d3_xyz_rgb(.0556434 * x - .2040259 * y + 1.0572252 * z));
  }
  function d3_lab_hcl(l, a, b) {
    return l > 0 ? new d3_hcl(Math.atan2(b, a) * d3_degrees, Math.sqrt(a * a + b * b), l) : new d3_hcl(NaN, NaN, l);
  }
  function d3_lab_xyz(x) {
    return x > .206893034 ? x * x * x : (x - 4 / 29) / 7.787037;
  }
  function d3_xyz_lab(x) {
    return x > .008856 ? Math.pow(x, 1 / 3) : 7.787037 * x + 4 / 29;
  }
  function d3_xyz_rgb(r) {
    return Math.round(255 * (r <= .00304 ? 12.92 * r : 1.055 * Math.pow(r, 1 / 2.4) - .055));
  }
  d3.rgb = d3_rgb;
  function d3_rgb(r, g, b) {
    return this instanceof d3_rgb ? void (this.r = ~~r, this.g = ~~g, this.b = ~~b) : arguments.length < 2 ? r instanceof d3_rgb ? new d3_rgb(r.r, r.g, r.b) : d3_rgb_parse("" + r, d3_rgb, d3_hsl_rgb) : new d3_rgb(r, g, b);
  }
  function d3_rgbNumber(value) {
    return new d3_rgb(value >> 16, value >> 8 & 255, value & 255);
  }
  function d3_rgbString(value) {
    return d3_rgbNumber(value) + "";
  }
  var d3_rgbPrototype = d3_rgb.prototype = new d3_color();
  d3_rgbPrototype.brighter = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    var r = this.r, g = this.g, b = this.b, i = 30;
    if (!r && !g && !b) return new d3_rgb(i, i, i);
    if (r && r < i) r = i;
    if (g && g < i) g = i;
    if (b && b < i) b = i;
    return new d3_rgb(Math.min(255, r / k), Math.min(255, g / k), Math.min(255, b / k));
  };
  d3_rgbPrototype.darker = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    return new d3_rgb(k * this.r, k * this.g, k * this.b);
  };
  d3_rgbPrototype.hsl = function() {
    return d3_rgb_hsl(this.r, this.g, this.b);
  };
  d3_rgbPrototype.toString = function() {
    return "#" + d3_rgb_hex(this.r) + d3_rgb_hex(this.g) + d3_rgb_hex(this.b);
  };
  function d3_rgb_hex(v) {
    return v < 16 ? "0" + Math.max(0, v).toString(16) : Math.min(255, v).toString(16);
  }
  function d3_rgb_parse(format, rgb, hsl) {
    var r = 0, g = 0, b = 0, m1, m2, color;
    m1 = /([a-z]+)\((.*)\)/.exec(format = format.toLowerCase());
    if (m1) {
      m2 = m1[2].split(",");
      switch (m1[1]) {
       case "hsl":
        {
          return hsl(parseFloat(m2[0]), parseFloat(m2[1]) / 100, parseFloat(m2[2]) / 100);
        }

       case "rgb":
        {
          return rgb(d3_rgb_parseNumber(m2[0]), d3_rgb_parseNumber(m2[1]), d3_rgb_parseNumber(m2[2]));
        }
      }
    }
    if (color = d3_rgb_names.get(format)) {
      return rgb(color.r, color.g, color.b);
    }
    if (format != null && format.charAt(0) === "#" && !isNaN(color = parseInt(format.slice(1), 16))) {
      if (format.length === 4) {
        r = (color & 3840) >> 4;
        r = r >> 4 | r;
        g = color & 240;
        g = g >> 4 | g;
        b = color & 15;
        b = b << 4 | b;
      } else if (format.length === 7) {
        r = (color & 16711680) >> 16;
        g = (color & 65280) >> 8;
        b = color & 255;
      }
    }
    return rgb(r, g, b);
  }
  function d3_rgb_hsl(r, g, b) {
    var min = Math.min(r /= 255, g /= 255, b /= 255), max = Math.max(r, g, b), d = max - min, h, s, l = (max + min) / 2;
    if (d) {
      s = l < .5 ? d / (max + min) : d / (2 - max - min);
      if (r == max) h = (g - b) / d + (g < b ? 6 : 0); else if (g == max) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60;
    } else {
      h = NaN;
      s = l > 0 && l < 1 ? 0 : h;
    }
    return new d3_hsl(h, s, l);
  }
  function d3_rgb_lab(r, g, b) {
    r = d3_rgb_xyz(r);
    g = d3_rgb_xyz(g);
    b = d3_rgb_xyz(b);
    var x = d3_xyz_lab((.4124564 * r + .3575761 * g + .1804375 * b) / d3_lab_X), y = d3_xyz_lab((.2126729 * r + .7151522 * g + .072175 * b) / d3_lab_Y), z = d3_xyz_lab((.0193339 * r + .119192 * g + .9503041 * b) / d3_lab_Z);
    return d3_lab(116 * y - 16, 500 * (x - y), 200 * (y - z));
  }
  function d3_rgb_xyz(r) {
    return (r /= 255) <= .04045 ? r / 12.92 : Math.pow((r + .055) / 1.055, 2.4);
  }
  function d3_rgb_parseNumber(c) {
    var f = parseFloat(c);
    return c.charAt(c.length - 1) === "%" ? Math.round(f * 2.55) : f;
  }
  var d3_rgb_names = d3.map({
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    rebeccapurple: 6697881,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074
  });
  d3_rgb_names.forEach(function(key, value) {
    d3_rgb_names.set(key, d3_rgbNumber(value));
  });
  function d3_functor(v) {
    return typeof v === "function" ? v : function() {
      return v;
    };
  }
  d3.functor = d3_functor;
  d3.xhr = d3_xhrType(d3_identity);
  function d3_xhrType(response) {
    return function(url, mimeType, callback) {
      if (arguments.length === 2 && typeof mimeType === "function") callback = mimeType, 
      mimeType = null;
      return d3_xhr(url, mimeType, response, callback);
    };
  }
  function d3_xhr(url, mimeType, response, callback) {
    var xhr = {}, dispatch = d3.dispatch("beforesend", "progress", "load", "error"), headers = {}, request = new XMLHttpRequest(), responseType = null;
    if (this.XDomainRequest && !("withCredentials" in request) && /^(http(s)?:)?\/\//.test(url)) request = new XDomainRequest();
    "onload" in request ? request.onload = request.onerror = respond : request.onreadystatechange = function() {
      request.readyState > 3 && respond();
    };
    function respond() {
      var status = request.status, result;
      if (!status && d3_xhrHasResponse(request) || status >= 200 && status < 300 || status === 304) {
        try {
          result = response.call(xhr, request);
        } catch (e) {
          dispatch.error.call(xhr, e);
          return;
        }
        dispatch.load.call(xhr, result);
      } else {
        dispatch.error.call(xhr, request);
      }
    }
    request.onprogress = function(event) {
      var o = d3.event;
      d3.event = event;
      try {
        dispatch.progress.call(xhr, request);
      } finally {
        d3.event = o;
      }
    };
    xhr.header = function(name, value) {
      name = (name + "").toLowerCase();
      if (arguments.length < 2) return headers[name];
      if (value == null) delete headers[name]; else headers[name] = value + "";
      return xhr;
    };
    xhr.mimeType = function(value) {
      if (!arguments.length) return mimeType;
      mimeType = value == null ? null : value + "";
      return xhr;
    };
    xhr.responseType = function(value) {
      if (!arguments.length) return responseType;
      responseType = value;
      return xhr;
    };
    xhr.response = function(value) {
      response = value;
      return xhr;
    };
    [ "get", "post" ].forEach(function(method) {
      xhr[method] = function() {
        return xhr.send.apply(xhr, [ method ].concat(d3_array(arguments)));
      };
    });
    xhr.send = function(method, data, callback) {
      if (arguments.length === 2 && typeof data === "function") callback = data, data = null;
      request.open(method, url, true);
      if (mimeType != null && !("accept" in headers)) headers["accept"] = mimeType + ",*/*";
      if (request.setRequestHeader) for (var name in headers) request.setRequestHeader(name, headers[name]);
      if (mimeType != null && request.overrideMimeType) request.overrideMimeType(mimeType);
      if (responseType != null) request.responseType = responseType;
      if (callback != null) xhr.on("error", callback).on("load", function(request) {
        callback(null, request);
      });
      dispatch.beforesend.call(xhr, request);
      request.send(data == null ? null : data);
      return xhr;
    };
    xhr.abort = function() {
      request.abort();
      return xhr;
    };
    d3.rebind(xhr, dispatch, "on");
    return callback == null ? xhr : xhr.get(d3_xhr_fixCallback(callback));
  }
  function d3_xhr_fixCallback(callback) {
    return callback.length === 1 ? function(error, request) {
      callback(error == null ? request : null);
    } : callback;
  }
  function d3_xhrHasResponse(request) {
    var type = request.responseType;
    return type && type !== "text" ? request.response : request.responseText;
  }
  d3.dsv = function(delimiter, mimeType) {
    var reFormat = new RegExp('["' + delimiter + "\n]"), delimiterCode = delimiter.charCodeAt(0);
    function dsv(url, row, callback) {
      if (arguments.length < 3) callback = row, row = null;
      var xhr = d3_xhr(url, mimeType, row == null ? response : typedResponse(row), callback);
      xhr.row = function(_) {
        return arguments.length ? xhr.response((row = _) == null ? response : typedResponse(_)) : row;
      };
      return xhr;
    }
    function response(request) {
      return dsv.parse(request.responseText);
    }
    function typedResponse(f) {
      return function(request) {
        return dsv.parse(request.responseText, f);
      };
    }
    dsv.parse = function(text, f) {
      var o;
      return dsv.parseRows(text, function(row, i) {
        if (o) return o(row, i - 1);
        var a = new Function("d", "return {" + row.map(function(name, i) {
          return JSON.stringify(name) + ": d[" + i + "]";
        }).join(",") + "}");
        o = f ? function(row, i) {
          return f(a(row), i);
        } : a;
      });
    };
    dsv.parseRows = function(text, f) {
      var EOL = {}, EOF = {}, rows = [], N = text.length, I = 0, n = 0, t, eol;
      function token() {
        if (I >= N) return EOF;
        if (eol) return eol = false, EOL;
        var j = I;
        if (text.charCodeAt(j) === 34) {
          var i = j;
          while (i++ < N) {
            if (text.charCodeAt(i) === 34) {
              if (text.charCodeAt(i + 1) !== 34) break;
              ++i;
            }
          }
          I = i + 2;
          var c = text.charCodeAt(i + 1);
          if (c === 13) {
            eol = true;
            if (text.charCodeAt(i + 2) === 10) ++I;
          } else if (c === 10) {
            eol = true;
          }
          return text.slice(j + 1, i).replace(/""/g, '"');
        }
        while (I < N) {
          var c = text.charCodeAt(I++), k = 1;
          if (c === 10) eol = true; else if (c === 13) {
            eol = true;
            if (text.charCodeAt(I) === 10) ++I, ++k;
          } else if (c !== delimiterCode) continue;
          return text.slice(j, I - k);
        }
        return text.slice(j);
      }
      while ((t = token()) !== EOF) {
        var a = [];
        while (t !== EOL && t !== EOF) {
          a.push(t);
          t = token();
        }
        if (f && (a = f(a, n++)) == null) continue;
        rows.push(a);
      }
      return rows;
    };
    dsv.format = function(rows) {
      if (Array.isArray(rows[0])) return dsv.formatRows(rows);
      var fieldSet = new d3_Set(), fields = [];
      rows.forEach(function(row) {
        for (var field in row) {
          if (!fieldSet.has(field)) {
            fields.push(fieldSet.add(field));
          }
        }
      });
      return [ fields.map(formatValue).join(delimiter) ].concat(rows.map(function(row) {
        return fields.map(function(field) {
          return formatValue(row[field]);
        }).join(delimiter);
      })).join("\n");
    };
    dsv.formatRows = function(rows) {
      return rows.map(formatRow).join("\n");
    };
    function formatRow(row) {
      return row.map(formatValue).join(delimiter);
    }
    function formatValue(text) {
      return reFormat.test(text) ? '"' + text.replace(/\"/g, '""') + '"' : text;
    }
    return dsv;
  };
  d3.csv = d3.dsv(",", "text/csv");
  d3.tsv = d3.dsv("	", "text/tab-separated-values");
  var d3_timer_queueHead, d3_timer_queueTail, d3_timer_interval, d3_timer_timeout, d3_timer_frame = this[d3_vendorSymbol(this, "requestAnimationFrame")] || function(callback) {
    setTimeout(callback, 17);
  };
  d3.timer = function() {
    d3_timer.apply(this, arguments);
  };
  function d3_timer(callback, delay, then) {
    var n = arguments.length;
    if (n < 2) delay = 0;
    if (n < 3) then = Date.now();
    var time = then + delay, timer = {
      c: callback,
      t: time,
      n: null
    };
    if (d3_timer_queueTail) d3_timer_queueTail.n = timer; else d3_timer_queueHead = timer;
    d3_timer_queueTail = timer;
    if (!d3_timer_interval) {
      d3_timer_timeout = clearTimeout(d3_timer_timeout);
      d3_timer_interval = 1;
      d3_timer_frame(d3_timer_step);
    }
    return timer;
  }
  function d3_timer_step() {
    var now = d3_timer_mark(), delay = d3_timer_sweep() - now;
    if (delay > 24) {
      if (isFinite(delay)) {
        clearTimeout(d3_timer_timeout);
        d3_timer_timeout = setTimeout(d3_timer_step, delay);
      }
      d3_timer_interval = 0;
    } else {
      d3_timer_interval = 1;
      d3_timer_frame(d3_timer_step);
    }
  }
  d3.timer.flush = function() {
    d3_timer_mark();
    d3_timer_sweep();
  };
  function d3_timer_mark() {
    var now = Date.now(), timer = d3_timer_queueHead;
    while (timer) {
      if (now >= timer.t && timer.c(now - timer.t)) timer.c = null;
      timer = timer.n;
    }
    return now;
  }
  function d3_timer_sweep() {
    var t0, t1 = d3_timer_queueHead, time = Infinity;
    while (t1) {
      if (t1.c) {
        if (t1.t < time) time = t1.t;
        t1 = (t0 = t1).n;
      } else {
        t1 = t0 ? t0.n = t1.n : d3_timer_queueHead = t1.n;
      }
    }
    d3_timer_queueTail = t0;
    return time;
  }
  function d3_format_precision(x, p) {
    return p - (x ? Math.ceil(Math.log(x) / Math.LN10) : 1);
  }
  d3.round = function(x, n) {
    return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x);
  };
  var d3_formatPrefixes = [ "y", "z", "a", "f", "p", "n", "µ", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y" ].map(d3_formatPrefix);
  d3.formatPrefix = function(value, precision) {
    var i = 0;
    if (value = +value) {
      if (value < 0) value *= -1;
      if (precision) value = d3.round(value, d3_format_precision(value, precision));
      i = 1 + Math.floor(1e-12 + Math.log(value) / Math.LN10);
      i = Math.max(-24, Math.min(24, Math.floor((i - 1) / 3) * 3));
    }
    return d3_formatPrefixes[8 + i / 3];
  };
  function d3_formatPrefix(d, i) {
    var k = Math.pow(10, abs(8 - i) * 3);
    return {
      scale: i > 8 ? function(d) {
        return d / k;
      } : function(d) {
        return d * k;
      },
      symbol: d
    };
  }
  function d3_locale_numberFormat(locale) {
    var locale_decimal = locale.decimal, locale_thousands = locale.thousands, locale_grouping = locale.grouping, locale_currency = locale.currency, formatGroup = locale_grouping && locale_thousands ? function(value, width) {
      var i = value.length, t = [], j = 0, g = locale_grouping[0], length = 0;
      while (i > 0 && g > 0) {
        if (length + g + 1 > width) g = Math.max(1, width - length);
        t.push(value.substring(i -= g, i + g));
        if ((length += g + 1) > width) break;
        g = locale_grouping[j = (j + 1) % locale_grouping.length];
      }
      return t.reverse().join(locale_thousands);
    } : d3_identity;
    return function(specifier) {
      var match = d3_format_re.exec(specifier), fill = match[1] || " ", align = match[2] || ">", sign = match[3] || "-", symbol = match[4] || "", zfill = match[5], width = +match[6], comma = match[7], precision = match[8], type = match[9], scale = 1, prefix = "", suffix = "", integer = false, exponent = true;
      if (precision) precision = +precision.substring(1);
      if (zfill || fill === "0" && align === "=") {
        zfill = fill = "0";
        align = "=";
      }
      switch (type) {
       case "n":
        comma = true;
        type = "g";
        break;

       case "%":
        scale = 100;
        suffix = "%";
        type = "f";
        break;

       case "p":
        scale = 100;
        suffix = "%";
        type = "r";
        break;

       case "b":
       case "o":
       case "x":
       case "X":
        if (symbol === "#") prefix = "0" + type.toLowerCase();

       case "c":
        exponent = false;

       case "d":
        integer = true;
        precision = 0;
        break;

       case "s":
        scale = -1;
        type = "r";
        break;
      }
      if (symbol === "$") prefix = locale_currency[0], suffix = locale_currency[1];
      if (type == "r" && !precision) type = "g";
      if (precision != null) {
        if (type == "g") precision = Math.max(1, Math.min(21, precision)); else if (type == "e" || type == "f") precision = Math.max(0, Math.min(20, precision));
      }
      type = d3_format_types.get(type) || d3_format_typeDefault;
      var zcomma = zfill && comma;
      return function(value) {
        var fullSuffix = suffix;
        if (integer && value % 1) return "";
        var negative = value < 0 || value === 0 && 1 / value < 0 ? (value = -value, "-") : sign === "-" ? "" : sign;
        if (scale < 0) {
          var unit = d3.formatPrefix(value, precision);
          value = unit.scale(value);
          fullSuffix = unit.symbol + suffix;
        } else {
          value *= scale;
        }
        value = type(value, precision);
        var i = value.lastIndexOf("."), before, after;
        if (i < 0) {
          var j = exponent ? value.lastIndexOf("e") : -1;
          if (j < 0) before = value, after = ""; else before = value.substring(0, j), after = value.substring(j);
        } else {
          before = value.substring(0, i);
          after = locale_decimal + value.substring(i + 1);
        }
        if (!zfill && comma) before = formatGroup(before, Infinity);
        var length = prefix.length + before.length + after.length + (zcomma ? 0 : negative.length), padding = length < width ? new Array(length = width - length + 1).join(fill) : "";
        if (zcomma) before = formatGroup(padding + before, padding.length ? width - after.length : Infinity);
        negative += prefix;
        value = before + after;
        return (align === "<" ? negative + value + padding : align === ">" ? padding + negative + value : align === "^" ? padding.substring(0, length >>= 1) + negative + value + padding.substring(length) : negative + (zcomma ? value : padding + value)) + fullSuffix;
      };
    };
  }
  var d3_format_re = /(?:([^{])?([<>=^]))?([+\- ])?([$#])?(0)?(\d+)?(,)?(\.-?\d+)?([a-z%])?/i;
  var d3_format_types = d3.map({
    b: function(x) {
      return x.toString(2);
    },
    c: function(x) {
      return String.fromCharCode(x);
    },
    o: function(x) {
      return x.toString(8);
    },
    x: function(x) {
      return x.toString(16);
    },
    X: function(x) {
      return x.toString(16).toUpperCase();
    },
    g: function(x, p) {
      return x.toPrecision(p);
    },
    e: function(x, p) {
      return x.toExponential(p);
    },
    f: function(x, p) {
      return x.toFixed(p);
    },
    r: function(x, p) {
      return (x = d3.round(x, d3_format_precision(x, p))).toFixed(Math.max(0, Math.min(20, d3_format_precision(x * (1 + 1e-15), p))));
    }
  });
  function d3_format_typeDefault(x) {
    return x + "";
  }
  var d3_time = d3.time = {}, d3_date = Date;
  function d3_date_utc() {
    this._ = new Date(arguments.length > 1 ? Date.UTC.apply(this, arguments) : arguments[0]);
  }
  d3_date_utc.prototype = {
    getDate: function() {
      return this._.getUTCDate();
    },
    getDay: function() {
      return this._.getUTCDay();
    },
    getFullYear: function() {
      return this._.getUTCFullYear();
    },
    getHours: function() {
      return this._.getUTCHours();
    },
    getMilliseconds: function() {
      return this._.getUTCMilliseconds();
    },
    getMinutes: function() {
      return this._.getUTCMinutes();
    },
    getMonth: function() {
      return this._.getUTCMonth();
    },
    getSeconds: function() {
      return this._.getUTCSeconds();
    },
    getTime: function() {
      return this._.getTime();
    },
    getTimezoneOffset: function() {
      return 0;
    },
    valueOf: function() {
      return this._.valueOf();
    },
    setDate: function() {
      d3_time_prototype.setUTCDate.apply(this._, arguments);
    },
    setDay: function() {
      d3_time_prototype.setUTCDay.apply(this._, arguments);
    },
    setFullYear: function() {
      d3_time_prototype.setUTCFullYear.apply(this._, arguments);
    },
    setHours: function() {
      d3_time_prototype.setUTCHours.apply(this._, arguments);
    },
    setMilliseconds: function() {
      d3_time_prototype.setUTCMilliseconds.apply(this._, arguments);
    },
    setMinutes: function() {
      d3_time_prototype.setUTCMinutes.apply(this._, arguments);
    },
    setMonth: function() {
      d3_time_prototype.setUTCMonth.apply(this._, arguments);
    },
    setSeconds: function() {
      d3_time_prototype.setUTCSeconds.apply(this._, arguments);
    },
    setTime: function() {
      d3_time_prototype.setTime.apply(this._, arguments);
    }
  };
  var d3_time_prototype = Date.prototype;
  function d3_time_interval(local, step, number) {
    function round(date) {
      var d0 = local(date), d1 = offset(d0, 1);
      return date - d0 < d1 - date ? d0 : d1;
    }
    function ceil(date) {
      step(date = local(new d3_date(date - 1)), 1);
      return date;
    }
    function offset(date, k) {
      step(date = new d3_date(+date), k);
      return date;
    }
    function range(t0, t1, dt) {
      var time = ceil(t0), times = [];
      if (dt > 1) {
        while (time < t1) {
          if (!(number(time) % dt)) times.push(new Date(+time));
          step(time, 1);
        }
      } else {
        while (time < t1) times.push(new Date(+time)), step(time, 1);
      }
      return times;
    }
    function range_utc(t0, t1, dt) {
      try {
        d3_date = d3_date_utc;
        var utc = new d3_date_utc();
        utc._ = t0;
        return range(utc, t1, dt);
      } finally {
        d3_date = Date;
      }
    }
    local.floor = local;
    local.round = round;
    local.ceil = ceil;
    local.offset = offset;
    local.range = range;
    var utc = local.utc = d3_time_interval_utc(local);
    utc.floor = utc;
    utc.round = d3_time_interval_utc(round);
    utc.ceil = d3_time_interval_utc(ceil);
    utc.offset = d3_time_interval_utc(offset);
    utc.range = range_utc;
    return local;
  }
  function d3_time_interval_utc(method) {
    return function(date, k) {
      try {
        d3_date = d3_date_utc;
        var utc = new d3_date_utc();
        utc._ = date;
        return method(utc, k)._;
      } finally {
        d3_date = Date;
      }
    };
  }
  d3_time.year = d3_time_interval(function(date) {
    date = d3_time.day(date);
    date.setMonth(0, 1);
    return date;
  }, function(date, offset) {
    date.setFullYear(date.getFullYear() + offset);
  }, function(date) {
    return date.getFullYear();
  });
  d3_time.years = d3_time.year.range;
  d3_time.years.utc = d3_time.year.utc.range;
  d3_time.day = d3_time_interval(function(date) {
    var day = new d3_date(2e3, 0);
    day.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    return day;
  }, function(date, offset) {
    date.setDate(date.getDate() + offset);
  }, function(date) {
    return date.getDate() - 1;
  });
  d3_time.days = d3_time.day.range;
  d3_time.days.utc = d3_time.day.utc.range;
  d3_time.dayOfYear = function(date) {
    var year = d3_time.year(date);
    return Math.floor((date - year - (date.getTimezoneOffset() - year.getTimezoneOffset()) * 6e4) / 864e5);
  };
  [ "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday" ].forEach(function(day, i) {
    i = 7 - i;
    var interval = d3_time[day] = d3_time_interval(function(date) {
      (date = d3_time.day(date)).setDate(date.getDate() - (date.getDay() + i) % 7);
      return date;
    }, function(date, offset) {
      date.setDate(date.getDate() + Math.floor(offset) * 7);
    }, function(date) {
      var day = d3_time.year(date).getDay();
      return Math.floor((d3_time.dayOfYear(date) + (day + i) % 7) / 7) - (day !== i);
    });
    d3_time[day + "s"] = interval.range;
    d3_time[day + "s"].utc = interval.utc.range;
    d3_time[day + "OfYear"] = function(date) {
      var day = d3_time.year(date).getDay();
      return Math.floor((d3_time.dayOfYear(date) + (day + i) % 7) / 7);
    };
  });
  d3_time.week = d3_time.sunday;
  d3_time.weeks = d3_time.sunday.range;
  d3_time.weeks.utc = d3_time.sunday.utc.range;
  d3_time.weekOfYear = d3_time.sundayOfYear;
  function d3_locale_timeFormat(locale) {
    var locale_dateTime = locale.dateTime, locale_date = locale.date, locale_time = locale.time, locale_periods = locale.periods, locale_days = locale.days, locale_shortDays = locale.shortDays, locale_months = locale.months, locale_shortMonths = locale.shortMonths;
    function d3_time_format(template) {
      var n = template.length;
      function format(date) {
        var string = [], i = -1, j = 0, c, p, f;
        while (++i < n) {
          if (template.charCodeAt(i) === 37) {
            string.push(template.slice(j, i));
            if ((p = d3_time_formatPads[c = template.charAt(++i)]) != null) c = template.charAt(++i);
            if (f = d3_time_formats[c]) c = f(date, p == null ? c === "e" ? " " : "0" : p);
            string.push(c);
            j = i + 1;
          }
        }
        string.push(template.slice(j, i));
        return string.join("");
      }
      format.parse = function(string) {
        var d = {
          y: 1900,
          m: 0,
          d: 1,
          H: 0,
          M: 0,
          S: 0,
          L: 0,
          Z: null
        }, i = d3_time_parse(d, template, string, 0);
        if (i != string.length) return null;
        if ("p" in d) d.H = d.H % 12 + d.p * 12;
        var localZ = d.Z != null && d3_date !== d3_date_utc, date = new (localZ ? d3_date_utc : d3_date)();
        if ("j" in d) date.setFullYear(d.y, 0, d.j); else if ("W" in d || "U" in d) {
          if (!("w" in d)) d.w = "W" in d ? 1 : 0;
          date.setFullYear(d.y, 0, 1);
          date.setFullYear(d.y, 0, "W" in d ? (d.w + 6) % 7 + d.W * 7 - (date.getDay() + 5) % 7 : d.w + d.U * 7 - (date.getDay() + 6) % 7);
        } else date.setFullYear(d.y, d.m, d.d);
        date.setHours(d.H + (d.Z / 100 | 0), d.M + d.Z % 100, d.S, d.L);
        return localZ ? date._ : date;
      };
      format.toString = function() {
        return template;
      };
      return format;
    }
    function d3_time_parse(date, template, string, j) {
      var c, p, t, i = 0, n = template.length, m = string.length;
      while (i < n) {
        if (j >= m) return -1;
        c = template.charCodeAt(i++);
        if (c === 37) {
          t = template.charAt(i++);
          p = d3_time_parsers[t in d3_time_formatPads ? template.charAt(i++) : t];
          if (!p || (j = p(date, string, j)) < 0) return -1;
        } else if (c != string.charCodeAt(j++)) {
          return -1;
        }
      }
      return j;
    }
    d3_time_format.utc = function(template) {
      var local = d3_time_format(template);
      function format(date) {
        try {
          d3_date = d3_date_utc;
          var utc = new d3_date();
          utc._ = date;
          return local(utc);
        } finally {
          d3_date = Date;
        }
      }
      format.parse = function(string) {
        try {
          d3_date = d3_date_utc;
          var date = local.parse(string);
          return date && date._;
        } finally {
          d3_date = Date;
        }
      };
      format.toString = local.toString;
      return format;
    };
    d3_time_format.multi = d3_time_format.utc.multi = d3_time_formatMulti;
    var d3_time_periodLookup = d3.map(), d3_time_dayRe = d3_time_formatRe(locale_days), d3_time_dayLookup = d3_time_formatLookup(locale_days), d3_time_dayAbbrevRe = d3_time_formatRe(locale_shortDays), d3_time_dayAbbrevLookup = d3_time_formatLookup(locale_shortDays), d3_time_monthRe = d3_time_formatRe(locale_months), d3_time_monthLookup = d3_time_formatLookup(locale_months), d3_time_monthAbbrevRe = d3_time_formatRe(locale_shortMonths), d3_time_monthAbbrevLookup = d3_time_formatLookup(locale_shortMonths);
    locale_periods.forEach(function(p, i) {
      d3_time_periodLookup.set(p.toLowerCase(), i);
    });
    var d3_time_formats = {
      a: function(d) {
        return locale_shortDays[d.getDay()];
      },
      A: function(d) {
        return locale_days[d.getDay()];
      },
      b: function(d) {
        return locale_shortMonths[d.getMonth()];
      },
      B: function(d) {
        return locale_months[d.getMonth()];
      },
      c: d3_time_format(locale_dateTime),
      d: function(d, p) {
        return d3_time_formatPad(d.getDate(), p, 2);
      },
      e: function(d, p) {
        return d3_time_formatPad(d.getDate(), p, 2);
      },
      H: function(d, p) {
        return d3_time_formatPad(d.getHours(), p, 2);
      },
      I: function(d, p) {
        return d3_time_formatPad(d.getHours() % 12 || 12, p, 2);
      },
      j: function(d, p) {
        return d3_time_formatPad(1 + d3_time.dayOfYear(d), p, 3);
      },
      L: function(d, p) {
        return d3_time_formatPad(d.getMilliseconds(), p, 3);
      },
      m: function(d, p) {
        return d3_time_formatPad(d.getMonth() + 1, p, 2);
      },
      M: function(d, p) {
        return d3_time_formatPad(d.getMinutes(), p, 2);
      },
      p: function(d) {
        return locale_periods[+(d.getHours() >= 12)];
      },
      S: function(d, p) {
        return d3_time_formatPad(d.getSeconds(), p, 2);
      },
      U: function(d, p) {
        return d3_time_formatPad(d3_time.sundayOfYear(d), p, 2);
      },
      w: function(d) {
        return d.getDay();
      },
      W: function(d, p) {
        return d3_time_formatPad(d3_time.mondayOfYear(d), p, 2);
      },
      x: d3_time_format(locale_date),
      X: d3_time_format(locale_time),
      y: function(d, p) {
        return d3_time_formatPad(d.getFullYear() % 100, p, 2);
      },
      Y: function(d, p) {
        return d3_time_formatPad(d.getFullYear() % 1e4, p, 4);
      },
      Z: d3_time_zone,
      "%": function() {
        return "%";
      }
    };
    var d3_time_parsers = {
      a: d3_time_parseWeekdayAbbrev,
      A: d3_time_parseWeekday,
      b: d3_time_parseMonthAbbrev,
      B: d3_time_parseMonth,
      c: d3_time_parseLocaleFull,
      d: d3_time_parseDay,
      e: d3_time_parseDay,
      H: d3_time_parseHour24,
      I: d3_time_parseHour24,
      j: d3_time_parseDayOfYear,
      L: d3_time_parseMilliseconds,
      m: d3_time_parseMonthNumber,
      M: d3_time_parseMinutes,
      p: d3_time_parseAmPm,
      S: d3_time_parseSeconds,
      U: d3_time_parseWeekNumberSunday,
      w: d3_time_parseWeekdayNumber,
      W: d3_time_parseWeekNumberMonday,
      x: d3_time_parseLocaleDate,
      X: d3_time_parseLocaleTime,
      y: d3_time_parseYear,
      Y: d3_time_parseFullYear,
      Z: d3_time_parseZone,
      "%": d3_time_parseLiteralPercent
    };
    function d3_time_parseWeekdayAbbrev(date, string, i) {
      d3_time_dayAbbrevRe.lastIndex = 0;
      var n = d3_time_dayAbbrevRe.exec(string.slice(i));
      return n ? (date.w = d3_time_dayAbbrevLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
    }
    function d3_time_parseWeekday(date, string, i) {
      d3_time_dayRe.lastIndex = 0;
      var n = d3_time_dayRe.exec(string.slice(i));
      return n ? (date.w = d3_time_dayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
    }
    function d3_time_parseMonthAbbrev(date, string, i) {
      d3_time_monthAbbrevRe.lastIndex = 0;
      var n = d3_time_monthAbbrevRe.exec(string.slice(i));
      return n ? (date.m = d3_time_monthAbbrevLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
    }
    function d3_time_parseMonth(date, string, i) {
      d3_time_monthRe.lastIndex = 0;
      var n = d3_time_monthRe.exec(string.slice(i));
      return n ? (date.m = d3_time_monthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
    }
    function d3_time_parseLocaleFull(date, string, i) {
      return d3_time_parse(date, d3_time_formats.c.toString(), string, i);
    }
    function d3_time_parseLocaleDate(date, string, i) {
      return d3_time_parse(date, d3_time_formats.x.toString(), string, i);
    }
    function d3_time_parseLocaleTime(date, string, i) {
      return d3_time_parse(date, d3_time_formats.X.toString(), string, i);
    }
    function d3_time_parseAmPm(date, string, i) {
      var n = d3_time_periodLookup.get(string.slice(i, i += 2).toLowerCase());
      return n == null ? -1 : (date.p = n, i);
    }
    return d3_time_format;
  }
  var d3_time_formatPads = {
    "-": "",
    _: " ",
    "0": "0"
  }, d3_time_numberRe = /^\s*\d+/, d3_time_percentRe = /^%/;
  function d3_time_formatPad(value, fill, width) {
    var sign = value < 0 ? "-" : "", string = (sign ? -value : value) + "", length = string.length;
    return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
  }
  function d3_time_formatRe(names) {
    return new RegExp("^(?:" + names.map(d3.requote).join("|") + ")", "i");
  }
  function d3_time_formatLookup(names) {
    var map = new d3_Map(), i = -1, n = names.length;
    while (++i < n) map.set(names[i].toLowerCase(), i);
    return map;
  }
  function d3_time_parseWeekdayNumber(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.slice(i, i + 1));
    return n ? (date.w = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseWeekNumberSunday(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.slice(i));
    return n ? (date.U = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseWeekNumberMonday(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.slice(i));
    return n ? (date.W = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseFullYear(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.slice(i, i + 4));
    return n ? (date.y = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseYear(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.slice(i, i + 2));
    return n ? (date.y = d3_time_expandYear(+n[0]), i + n[0].length) : -1;
  }
  function d3_time_parseZone(date, string, i) {
    return /^[+-]\d{4}$/.test(string = string.slice(i, i + 5)) ? (date.Z = -string, 
    i + 5) : -1;
  }
  function d3_time_expandYear(d) {
    return d + (d > 68 ? 1900 : 2e3);
  }
  function d3_time_parseMonthNumber(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.slice(i, i + 2));
    return n ? (date.m = n[0] - 1, i + n[0].length) : -1;
  }
  function d3_time_parseDay(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.slice(i, i + 2));
    return n ? (date.d = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseDayOfYear(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.slice(i, i + 3));
    return n ? (date.j = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseHour24(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.slice(i, i + 2));
    return n ? (date.H = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseMinutes(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.slice(i, i + 2));
    return n ? (date.M = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseSeconds(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.slice(i, i + 2));
    return n ? (date.S = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseMilliseconds(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.slice(i, i + 3));
    return n ? (date.L = +n[0], i + n[0].length) : -1;
  }
  function d3_time_zone(d) {
    var z = d.getTimezoneOffset(), zs = z > 0 ? "-" : "+", zh = abs(z) / 60 | 0, zm = abs(z) % 60;
    return zs + d3_time_formatPad(zh, "0", 2) + d3_time_formatPad(zm, "0", 2);
  }
  function d3_time_parseLiteralPercent(date, string, i) {
    d3_time_percentRe.lastIndex = 0;
    var n = d3_time_percentRe.exec(string.slice(i, i + 1));
    return n ? i + n[0].length : -1;
  }
  function d3_time_formatMulti(formats) {
    var n = formats.length, i = -1;
    while (++i < n) formats[i][0] = this(formats[i][0]);
    return function(date) {
      var i = 0, f = formats[i];
      while (!f[1](date)) f = formats[++i];
      return f[0](date);
    };
  }
  d3.locale = function(locale) {
    return {
      numberFormat: d3_locale_numberFormat(locale),
      timeFormat: d3_locale_timeFormat(locale)
    };
  };
  var d3_locale_enUS = d3.locale({
    decimal: ".",
    thousands: ",",
    grouping: [ 3 ],
    currency: [ "$", "" ],
    dateTime: "%a %b %e %X %Y",
    date: "%m/%d/%Y",
    time: "%H:%M:%S",
    periods: [ "AM", "PM" ],
    days: [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
    shortDays: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ],
    months: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ],
    shortMonths: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ]
  });
  d3.format = d3_locale_enUS.numberFormat;
  d3.geo = {};
  function d3_adder() {}
  d3_adder.prototype = {
    s: 0,
    t: 0,
    add: function(y) {
      d3_adderSum(y, this.t, d3_adderTemp);
      d3_adderSum(d3_adderTemp.s, this.s, this);
      if (this.s) this.t += d3_adderTemp.t; else this.s = d3_adderTemp.t;
    },
    reset: function() {
      this.s = this.t = 0;
    },
    valueOf: function() {
      return this.s;
    }
  };
  var d3_adderTemp = new d3_adder();
  function d3_adderSum(a, b, o) {
    var x = o.s = a + b, bv = x - a, av = x - bv;
    o.t = a - av + (b - bv);
  }
  d3.geo.stream = function(object, listener) {
    if (object && d3_geo_streamObjectType.hasOwnProperty(object.type)) {
      d3_geo_streamObjectType[object.type](object, listener);
    } else {
      d3_geo_streamGeometry(object, listener);
    }
  };
  function d3_geo_streamGeometry(geometry, listener) {
    if (geometry && d3_geo_streamGeometryType.hasOwnProperty(geometry.type)) {
      d3_geo_streamGeometryType[geometry.type](geometry, listener);
    }
  }
  var d3_geo_streamObjectType = {
    Feature: function(feature, listener) {
      d3_geo_streamGeometry(feature.geometry, listener);
    },
    FeatureCollection: function(object, listener) {
      var features = object.features, i = -1, n = features.length;
      while (++i < n) d3_geo_streamGeometry(features[i].geometry, listener);
    }
  };
  var d3_geo_streamGeometryType = {
    Sphere: function(object, listener) {
      listener.sphere();
    },
    Point: function(object, listener) {
      object = object.coordinates;
      listener.point(object[0], object[1], object[2]);
    },
    MultiPoint: function(object, listener) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) object = coordinates[i], listener.point(object[0], object[1], object[2]);
    },
    LineString: function(object, listener) {
      d3_geo_streamLine(object.coordinates, listener, 0);
    },
    MultiLineString: function(object, listener) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) d3_geo_streamLine(coordinates[i], listener, 0);
    },
    Polygon: function(object, listener) {
      d3_geo_streamPolygon(object.coordinates, listener);
    },
    MultiPolygon: function(object, listener) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) d3_geo_streamPolygon(coordinates[i], listener);
    },
    GeometryCollection: function(object, listener) {
      var geometries = object.geometries, i = -1, n = geometries.length;
      while (++i < n) d3_geo_streamGeometry(geometries[i], listener);
    }
  };
  function d3_geo_streamLine(coordinates, listener, closed) {
    var i = -1, n = coordinates.length - closed, coordinate;
    listener.lineStart();
    while (++i < n) coordinate = coordinates[i], listener.point(coordinate[0], coordinate[1], coordinate[2]);
    listener.lineEnd();
  }
  function d3_geo_streamPolygon(coordinates, listener) {
    var i = -1, n = coordinates.length;
    listener.polygonStart();
    while (++i < n) d3_geo_streamLine(coordinates[i], listener, 1);
    listener.polygonEnd();
  }
  d3.geo.area = function(object) {
    d3_geo_areaSum = 0;
    d3.geo.stream(object, d3_geo_area);
    return d3_geo_areaSum;
  };
  var d3_geo_areaSum, d3_geo_areaRingSum = new d3_adder();
  var d3_geo_area = {
    sphere: function() {
      d3_geo_areaSum += 4 * π;
    },
    point: d3_noop,
    lineStart: d3_noop,
    lineEnd: d3_noop,
    polygonStart: function() {
      d3_geo_areaRingSum.reset();
      d3_geo_area.lineStart = d3_geo_areaRingStart;
    },
    polygonEnd: function() {
      var area = 2 * d3_geo_areaRingSum;
      d3_geo_areaSum += area < 0 ? 4 * π + area : area;
      d3_geo_area.lineStart = d3_geo_area.lineEnd = d3_geo_area.point = d3_noop;
    }
  };
  function d3_geo_areaRingStart() {
    var λ00, φ00, λ0, cosφ0, sinφ0;
    d3_geo_area.point = function(λ, φ) {
      d3_geo_area.point = nextPoint;
      λ0 = (λ00 = λ) * d3_radians, cosφ0 = Math.cos(φ = (φ00 = φ) * d3_radians / 2 + π / 4), 
      sinφ0 = Math.sin(φ);
    };
    function nextPoint(λ, φ) {
      λ *= d3_radians;
      φ = φ * d3_radians / 2 + π / 4;
      var dλ = λ - λ0, sdλ = dλ >= 0 ? 1 : -1, adλ = sdλ * dλ, cosφ = Math.cos(φ), sinφ = Math.sin(φ), k = sinφ0 * sinφ, u = cosφ0 * cosφ + k * Math.cos(adλ), v = k * sdλ * Math.sin(adλ);
      d3_geo_areaRingSum.add(Math.atan2(v, u));
      λ0 = λ, cosφ0 = cosφ, sinφ0 = sinφ;
    }
    d3_geo_area.lineEnd = function() {
      nextPoint(λ00, φ00);
    };
  }
  function d3_geo_cartesian(spherical) {
    var λ = spherical[0], φ = spherical[1], cosφ = Math.cos(φ);
    return [ cosφ * Math.cos(λ), cosφ * Math.sin(λ), Math.sin(φ) ];
  }
  function d3_geo_cartesianDot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function d3_geo_cartesianCross(a, b) {
    return [ a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0] ];
  }
  function d3_geo_cartesianAdd(a, b) {
    a[0] += b[0];
    a[1] += b[1];
    a[2] += b[2];
  }
  function d3_geo_cartesianScale(vector, k) {
    return [ vector[0] * k, vector[1] * k, vector[2] * k ];
  }
  function d3_geo_cartesianNormalize(d) {
    var l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
    d[0] /= l;
    d[1] /= l;
    d[2] /= l;
  }
  function d3_geo_spherical(cartesian) {
    return [ Math.atan2(cartesian[1], cartesian[0]), d3_asin(cartesian[2]) ];
  }
  function d3_geo_sphericalEqual(a, b) {
    return abs(a[0] - b[0]) < ε && abs(a[1] - b[1]) < ε;
  }
  d3.geo.bounds = function() {
    var λ0, φ0, λ1, φ1, λ_, λ__, φ__, p0, dλSum, ranges, range;
    var bound = {
      point: point,
      lineStart: lineStart,
      lineEnd: lineEnd,
      polygonStart: function() {
        bound.point = ringPoint;
        bound.lineStart = ringStart;
        bound.lineEnd = ringEnd;
        dλSum = 0;
        d3_geo_area.polygonStart();
      },
      polygonEnd: function() {
        d3_geo_area.polygonEnd();
        bound.point = point;
        bound.lineStart = lineStart;
        bound.lineEnd = lineEnd;
        if (d3_geo_areaRingSum < 0) λ0 = -(λ1 = 180), φ0 = -(φ1 = 90); else if (dλSum > ε) φ1 = 90; else if (dλSum < -ε) φ0 = -90;
        range[0] = λ0, range[1] = λ1;
      }
    };
    function point(λ, φ) {
      ranges.push(range = [ λ0 = λ, λ1 = λ ]);
      if (φ < φ0) φ0 = φ;
      if (φ > φ1) φ1 = φ;
    }
    function linePoint(λ, φ) {
      var p = d3_geo_cartesian([ λ * d3_radians, φ * d3_radians ]);
      if (p0) {
        var normal = d3_geo_cartesianCross(p0, p), equatorial = [ normal[1], -normal[0], 0 ], inflection = d3_geo_cartesianCross(equatorial, normal);
        d3_geo_cartesianNormalize(inflection);
        inflection = d3_geo_spherical(inflection);
        var dλ = λ - λ_, s = dλ > 0 ? 1 : -1, λi = inflection[0] * d3_degrees * s, antimeridian = abs(dλ) > 180;
        if (antimeridian ^ (s * λ_ < λi && λi < s * λ)) {
          var φi = inflection[1] * d3_degrees;
          if (φi > φ1) φ1 = φi;
        } else if (λi = (λi + 360) % 360 - 180, antimeridian ^ (s * λ_ < λi && λi < s * λ)) {
          var φi = -inflection[1] * d3_degrees;
          if (φi < φ0) φ0 = φi;
        } else {
          if (φ < φ0) φ0 = φ;
          if (φ > φ1) φ1 = φ;
        }
        if (antimeridian) {
          if (λ < λ_) {
            if (angle(λ0, λ) > angle(λ0, λ1)) λ1 = λ;
          } else {
            if (angle(λ, λ1) > angle(λ0, λ1)) λ0 = λ;
          }
        } else {
          if (λ1 >= λ0) {
            if (λ < λ0) λ0 = λ;
            if (λ > λ1) λ1 = λ;
          } else {
            if (λ > λ_) {
              if (angle(λ0, λ) > angle(λ0, λ1)) λ1 = λ;
            } else {
              if (angle(λ, λ1) > angle(λ0, λ1)) λ0 = λ;
            }
          }
        }
      } else {
        point(λ, φ);
      }
      p0 = p, λ_ = λ;
    }
    function lineStart() {
      bound.point = linePoint;
    }
    function lineEnd() {
      range[0] = λ0, range[1] = λ1;
      bound.point = point;
      p0 = null;
    }
    function ringPoint(λ, φ) {
      if (p0) {
        var dλ = λ - λ_;
        dλSum += abs(dλ) > 180 ? dλ + (dλ > 0 ? 360 : -360) : dλ;
      } else λ__ = λ, φ__ = φ;
      d3_geo_area.point(λ, φ);
      linePoint(λ, φ);
    }
    function ringStart() {
      d3_geo_area.lineStart();
    }
    function ringEnd() {
      ringPoint(λ__, φ__);
      d3_geo_area.lineEnd();
      if (abs(dλSum) > ε) λ0 = -(λ1 = 180);
      range[0] = λ0, range[1] = λ1;
      p0 = null;
    }
    function angle(λ0, λ1) {
      return (λ1 -= λ0) < 0 ? λ1 + 360 : λ1;
    }
    function compareRanges(a, b) {
      return a[0] - b[0];
    }
    function withinRange(x, range) {
      return range[0] <= range[1] ? range[0] <= x && x <= range[1] : x < range[0] || range[1] < x;
    }
    return function(feature) {
      φ1 = λ1 = -(λ0 = φ0 = Infinity);
      ranges = [];
      d3.geo.stream(feature, bound);
      var n = ranges.length;
      if (n) {
        ranges.sort(compareRanges);
        for (var i = 1, a = ranges[0], b, merged = [ a ]; i < n; ++i) {
          b = ranges[i];
          if (withinRange(b[0], a) || withinRange(b[1], a)) {
            if (angle(a[0], b[1]) > angle(a[0], a[1])) a[1] = b[1];
            if (angle(b[0], a[1]) > angle(a[0], a[1])) a[0] = b[0];
          } else {
            merged.push(a = b);
          }
        }
        var best = -Infinity, dλ;
        for (var n = merged.length - 1, i = 0, a = merged[n], b; i <= n; a = b, ++i) {
          b = merged[i];
          if ((dλ = angle(a[1], b[0])) > best) best = dλ, λ0 = b[0], λ1 = a[1];
        }
      }
      ranges = range = null;
      return λ0 === Infinity || φ0 === Infinity ? [ [ NaN, NaN ], [ NaN, NaN ] ] : [ [ λ0, φ0 ], [ λ1, φ1 ] ];
    };
  }();
  d3.geo.centroid = function(object) {
    d3_geo_centroidW0 = d3_geo_centroidW1 = d3_geo_centroidX0 = d3_geo_centroidY0 = d3_geo_centroidZ0 = d3_geo_centroidX1 = d3_geo_centroidY1 = d3_geo_centroidZ1 = d3_geo_centroidX2 = d3_geo_centroidY2 = d3_geo_centroidZ2 = 0;
    d3.geo.stream(object, d3_geo_centroid);
    var x = d3_geo_centroidX2, y = d3_geo_centroidY2, z = d3_geo_centroidZ2, m = x * x + y * y + z * z;
    if (m < ε2) {
      x = d3_geo_centroidX1, y = d3_geo_centroidY1, z = d3_geo_centroidZ1;
      if (d3_geo_centroidW1 < ε) x = d3_geo_centroidX0, y = d3_geo_centroidY0, z = d3_geo_centroidZ0;
      m = x * x + y * y + z * z;
      if (m < ε2) return [ NaN, NaN ];
    }
    return [ Math.atan2(y, x) * d3_degrees, d3_asin(z / Math.sqrt(m)) * d3_degrees ];
  };
  var d3_geo_centroidW0, d3_geo_centroidW1, d3_geo_centroidX0, d3_geo_centroidY0, d3_geo_centroidZ0, d3_geo_centroidX1, d3_geo_centroidY1, d3_geo_centroidZ1, d3_geo_centroidX2, d3_geo_centroidY2, d3_geo_centroidZ2;
  var d3_geo_centroid = {
    sphere: d3_noop,
    point: d3_geo_centroidPoint,
    lineStart: d3_geo_centroidLineStart,
    lineEnd: d3_geo_centroidLineEnd,
    polygonStart: function() {
      d3_geo_centroid.lineStart = d3_geo_centroidRingStart;
    },
    polygonEnd: function() {
      d3_geo_centroid.lineStart = d3_geo_centroidLineStart;
    }
  };
  function d3_geo_centroidPoint(λ, φ) {
    λ *= d3_radians;
    var cosφ = Math.cos(φ *= d3_radians);
    d3_geo_centroidPointXYZ(cosφ * Math.cos(λ), cosφ * Math.sin(λ), Math.sin(φ));
  }
  function d3_geo_centroidPointXYZ(x, y, z) {
    ++d3_geo_centroidW0;
    d3_geo_centroidX0 += (x - d3_geo_centroidX0) / d3_geo_centroidW0;
    d3_geo_centroidY0 += (y - d3_geo_centroidY0) / d3_geo_centroidW0;
    d3_geo_centroidZ0 += (z - d3_geo_centroidZ0) / d3_geo_centroidW0;
  }
  function d3_geo_centroidLineStart() {
    var x0, y0, z0;
    d3_geo_centroid.point = function(λ, φ) {
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians);
      x0 = cosφ * Math.cos(λ);
      y0 = cosφ * Math.sin(λ);
      z0 = Math.sin(φ);
      d3_geo_centroid.point = nextPoint;
      d3_geo_centroidPointXYZ(x0, y0, z0);
    };
    function nextPoint(λ, φ) {
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians), x = cosφ * Math.cos(λ), y = cosφ * Math.sin(λ), z = Math.sin(φ), w = Math.atan2(Math.sqrt((w = y0 * z - z0 * y) * w + (w = z0 * x - x0 * z) * w + (w = x0 * y - y0 * x) * w), x0 * x + y0 * y + z0 * z);
      d3_geo_centroidW1 += w;
      d3_geo_centroidX1 += w * (x0 + (x0 = x));
      d3_geo_centroidY1 += w * (y0 + (y0 = y));
      d3_geo_centroidZ1 += w * (z0 + (z0 = z));
      d3_geo_centroidPointXYZ(x0, y0, z0);
    }
  }
  function d3_geo_centroidLineEnd() {
    d3_geo_centroid.point = d3_geo_centroidPoint;
  }
  function d3_geo_centroidRingStart() {
    var λ00, φ00, x0, y0, z0;
    d3_geo_centroid.point = function(λ, φ) {
      λ00 = λ, φ00 = φ;
      d3_geo_centroid.point = nextPoint;
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians);
      x0 = cosφ * Math.cos(λ);
      y0 = cosφ * Math.sin(λ);
      z0 = Math.sin(φ);
      d3_geo_centroidPointXYZ(x0, y0, z0);
    };
    d3_geo_centroid.lineEnd = function() {
      nextPoint(λ00, φ00);
      d3_geo_centroid.lineEnd = d3_geo_centroidLineEnd;
      d3_geo_centroid.point = d3_geo_centroidPoint;
    };
    function nextPoint(λ, φ) {
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians), x = cosφ * Math.cos(λ), y = cosφ * Math.sin(λ), z = Math.sin(φ), cx = y0 * z - z0 * y, cy = z0 * x - x0 * z, cz = x0 * y - y0 * x, m = Math.sqrt(cx * cx + cy * cy + cz * cz), u = x0 * x + y0 * y + z0 * z, v = m && -d3_acos(u) / m, w = Math.atan2(m, u);
      d3_geo_centroidX2 += v * cx;
      d3_geo_centroidY2 += v * cy;
      d3_geo_centroidZ2 += v * cz;
      d3_geo_centroidW1 += w;
      d3_geo_centroidX1 += w * (x0 + (x0 = x));
      d3_geo_centroidY1 += w * (y0 + (y0 = y));
      d3_geo_centroidZ1 += w * (z0 + (z0 = z));
      d3_geo_centroidPointXYZ(x0, y0, z0);
    }
  }
  function d3_geo_compose(a, b) {
    function compose(x, y) {
      return x = a(x, y), b(x[0], x[1]);
    }
    if (a.invert && b.invert) compose.invert = function(x, y) {
      return x = b.invert(x, y), x && a.invert(x[0], x[1]);
    };
    return compose;
  }
  function d3_true() {
    return true;
  }
  function d3_geo_clipPolygon(segments, compare, clipStartInside, interpolate, listener) {
    var subject = [], clip = [];
    segments.forEach(function(segment) {
      if ((n = segment.length - 1) <= 0) return;
      var n, p0 = segment[0], p1 = segment[n];
      if (d3_geo_sphericalEqual(p0, p1)) {
        listener.lineStart();
        for (var i = 0; i < n; ++i) listener.point((p0 = segment[i])[0], p0[1]);
        listener.lineEnd();
        return;
      }
      var a = new d3_geo_clipPolygonIntersection(p0, segment, null, true), b = new d3_geo_clipPolygonIntersection(p0, null, a, false);
      a.o = b;
      subject.push(a);
      clip.push(b);
      a = new d3_geo_clipPolygonIntersection(p1, segment, null, false);
      b = new d3_geo_clipPolygonIntersection(p1, null, a, true);
      a.o = b;
      subject.push(a);
      clip.push(b);
    });
    clip.sort(compare);
    d3_geo_clipPolygonLinkCircular(subject);
    d3_geo_clipPolygonLinkCircular(clip);
    if (!subject.length) return;
    for (var i = 0, entry = clipStartInside, n = clip.length; i < n; ++i) {
      clip[i].e = entry = !entry;
    }
    var start = subject[0], points, point;
    while (1) {
      var current = start, isSubject = true;
      while (current.v) if ((current = current.n) === start) return;
      points = current.z;
      listener.lineStart();
      do {
        current.v = current.o.v = true;
        if (current.e) {
          if (isSubject) {
            for (var i = 0, n = points.length; i < n; ++i) listener.point((point = points[i])[0], point[1]);
          } else {
            interpolate(current.x, current.n.x, 1, listener);
          }
          current = current.n;
        } else {
          if (isSubject) {
            points = current.p.z;
            for (var i = points.length - 1; i >= 0; --i) listener.point((point = points[i])[0], point[1]);
          } else {
            interpolate(current.x, current.p.x, -1, listener);
          }
          current = current.p;
        }
        current = current.o;
        points = current.z;
        isSubject = !isSubject;
      } while (!current.v);
      listener.lineEnd();
    }
  }
  function d3_geo_clipPolygonLinkCircular(array) {
    if (!(n = array.length)) return;
    var n, i = 0, a = array[0], b;
    while (++i < n) {
      a.n = b = array[i];
      b.p = a;
      a = b;
    }
    a.n = b = array[0];
    b.p = a;
  }
  function d3_geo_clipPolygonIntersection(point, points, other, entry) {
    this.x = point;
    this.z = points;
    this.o = other;
    this.e = entry;
    this.v = false;
    this.n = this.p = null;
  }
  function d3_geo_clip(pointVisible, clipLine, interpolate, clipStart) {
    return function(rotate, listener) {
      var line = clipLine(listener), rotatedClipStart = rotate.invert(clipStart[0], clipStart[1]);
      var clip = {
        point: point,
        lineStart: lineStart,
        lineEnd: lineEnd,
        polygonStart: function() {
          clip.point = pointRing;
          clip.lineStart = ringStart;
          clip.lineEnd = ringEnd;
          segments = [];
          polygon = [];
        },
        polygonEnd: function() {
          clip.point = point;
          clip.lineStart = lineStart;
          clip.lineEnd = lineEnd;
          segments = d3.merge(segments);
          var clipStartInside = d3_geo_pointInPolygon(rotatedClipStart, polygon);
          if (segments.length) {
            if (!polygonStarted) listener.polygonStart(), polygonStarted = true;
            d3_geo_clipPolygon(segments, d3_geo_clipSort, clipStartInside, interpolate, listener);
          } else if (clipStartInside) {
            if (!polygonStarted) listener.polygonStart(), polygonStarted = true;
            listener.lineStart();
            interpolate(null, null, 1, listener);
            listener.lineEnd();
          }
          if (polygonStarted) listener.polygonEnd(), polygonStarted = false;
          segments = polygon = null;
        },
        sphere: function() {
          listener.polygonStart();
          listener.lineStart();
          interpolate(null, null, 1, listener);
          listener.lineEnd();
          listener.polygonEnd();
        }
      };
      function point(λ, φ) {
        var point = rotate(λ, φ);
        if (pointVisible(λ = point[0], φ = point[1])) listener.point(λ, φ);
      }
      function pointLine(λ, φ) {
        var point = rotate(λ, φ);
        line.point(point[0], point[1]);
      }
      function lineStart() {
        clip.point = pointLine;
        line.lineStart();
      }
      function lineEnd() {
        clip.point = point;
        line.lineEnd();
      }
      var segments;
      var buffer = d3_geo_clipBufferListener(), ringListener = clipLine(buffer), polygonStarted = false, polygon, ring;
      function pointRing(λ, φ) {
        ring.push([ λ, φ ]);
        var point = rotate(λ, φ);
        ringListener.point(point[0], point[1]);
      }
      function ringStart() {
        ringListener.lineStart();
        ring = [];
      }
      function ringEnd() {
        pointRing(ring[0][0], ring[0][1]);
        ringListener.lineEnd();
        var clean = ringListener.clean(), ringSegments = buffer.buffer(), segment, n = ringSegments.length;
        ring.pop();
        polygon.push(ring);
        ring = null;
        if (!n) return;
        if (clean & 1) {
          segment = ringSegments[0];
          var n = segment.length - 1, i = -1, point;
          if (n > 0) {
            if (!polygonStarted) listener.polygonStart(), polygonStarted = true;
            listener.lineStart();
            while (++i < n) listener.point((point = segment[i])[0], point[1]);
            listener.lineEnd();
          }
          return;
        }
        if (n > 1 && clean & 2) ringSegments.push(ringSegments.pop().concat(ringSegments.shift()));
        segments.push(ringSegments.filter(d3_geo_clipSegmentLength1));
      }
      return clip;
    };
  }
  function d3_geo_clipSegmentLength1(segment) {
    return segment.length > 1;
  }
  function d3_geo_clipBufferListener() {
    var lines = [], line;
    return {
      lineStart: function() {
        lines.push(line = []);
      },
      point: function(λ, φ) {
        line.push([ λ, φ ]);
      },
      lineEnd: d3_noop,
      buffer: function() {
        var buffer = lines;
        lines = [];
        line = null;
        return buffer;
      },
      rejoin: function() {
        if (lines.length > 1) lines.push(lines.pop().concat(lines.shift()));
      }
    };
  }
  function d3_geo_clipSort(a, b) {
    return ((a = a.x)[0] < 0 ? a[1] - halfπ - ε : halfπ - a[1]) - ((b = b.x)[0] < 0 ? b[1] - halfπ - ε : halfπ - b[1]);
  }
  var d3_geo_clipAntimeridian = d3_geo_clip(d3_true, d3_geo_clipAntimeridianLine, d3_geo_clipAntimeridianInterpolate, [ -π, -π / 2 ]);
  function d3_geo_clipAntimeridianLine(listener) {
    var λ0 = NaN, φ0 = NaN, sλ0 = NaN, clean;
    return {
      lineStart: function() {
        listener.lineStart();
        clean = 1;
      },
      point: function(λ1, φ1) {
        var sλ1 = λ1 > 0 ? π : -π, dλ = abs(λ1 - λ0);
        if (abs(dλ - π) < ε) {
          listener.point(λ0, φ0 = (φ0 + φ1) / 2 > 0 ? halfπ : -halfπ);
          listener.point(sλ0, φ0);
          listener.lineEnd();
          listener.lineStart();
          listener.point(sλ1, φ0);
          listener.point(λ1, φ0);
          clean = 0;
        } else if (sλ0 !== sλ1 && dλ >= π) {
          if (abs(λ0 - sλ0) < ε) λ0 -= sλ0 * ε;
          if (abs(λ1 - sλ1) < ε) λ1 -= sλ1 * ε;
          φ0 = d3_geo_clipAntimeridianIntersect(λ0, φ0, λ1, φ1);
          listener.point(sλ0, φ0);
          listener.lineEnd();
          listener.lineStart();
          listener.point(sλ1, φ0);
          clean = 0;
        }
        listener.point(λ0 = λ1, φ0 = φ1);
        sλ0 = sλ1;
      },
      lineEnd: function() {
        listener.lineEnd();
        λ0 = φ0 = NaN;
      },
      clean: function() {
        return 2 - clean;
      }
    };
  }
  function d3_geo_clipAntimeridianIntersect(λ0, φ0, λ1, φ1) {
    var cosφ0, cosφ1, sinλ0_λ1 = Math.sin(λ0 - λ1);
    return abs(sinλ0_λ1) > ε ? Math.atan((Math.sin(φ0) * (cosφ1 = Math.cos(φ1)) * Math.sin(λ1) - Math.sin(φ1) * (cosφ0 = Math.cos(φ0)) * Math.sin(λ0)) / (cosφ0 * cosφ1 * sinλ0_λ1)) : (φ0 + φ1) / 2;
  }
  function d3_geo_clipAntimeridianInterpolate(from, to, direction, listener) {
    var φ;
    if (from == null) {
      φ = direction * halfπ;
      listener.point(-π, φ);
      listener.point(0, φ);
      listener.point(π, φ);
      listener.point(π, 0);
      listener.point(π, -φ);
      listener.point(0, -φ);
      listener.point(-π, -φ);
      listener.point(-π, 0);
      listener.point(-π, φ);
    } else if (abs(from[0] - to[0]) > ε) {
      var s = from[0] < to[0] ? π : -π;
      φ = direction * s / 2;
      listener.point(-s, φ);
      listener.point(0, φ);
      listener.point(s, φ);
    } else {
      listener.point(to[0], to[1]);
    }
  }
  function d3_geo_pointInPolygon(point, polygon) {
    var meridian = point[0], parallel = point[1], meridianNormal = [ Math.sin(meridian), -Math.cos(meridian), 0 ], polarAngle = 0, winding = 0;
    d3_geo_areaRingSum.reset();
    for (var i = 0, n = polygon.length; i < n; ++i) {
      var ring = polygon[i], m = ring.length;
      if (!m) continue;
      var point0 = ring[0], λ0 = point0[0], φ0 = point0[1] / 2 + π / 4, sinφ0 = Math.sin(φ0), cosφ0 = Math.cos(φ0), j = 1;
      while (true) {
        if (j === m) j = 0;
        point = ring[j];
        var λ = point[0], φ = point[1] / 2 + π / 4, sinφ = Math.sin(φ), cosφ = Math.cos(φ), dλ = λ - λ0, sdλ = dλ >= 0 ? 1 : -1, adλ = sdλ * dλ, antimeridian = adλ > π, k = sinφ0 * sinφ;
        d3_geo_areaRingSum.add(Math.atan2(k * sdλ * Math.sin(adλ), cosφ0 * cosφ + k * Math.cos(adλ)));
        polarAngle += antimeridian ? dλ + sdλ * τ : dλ;
        if (antimeridian ^ λ0 >= meridian ^ λ >= meridian) {
          var arc = d3_geo_cartesianCross(d3_geo_cartesian(point0), d3_geo_cartesian(point));
          d3_geo_cartesianNormalize(arc);
          var intersection = d3_geo_cartesianCross(meridianNormal, arc);
          d3_geo_cartesianNormalize(intersection);
          var φarc = (antimeridian ^ dλ >= 0 ? -1 : 1) * d3_asin(intersection[2]);
          if (parallel > φarc || parallel === φarc && (arc[0] || arc[1])) {
            winding += antimeridian ^ dλ >= 0 ? 1 : -1;
          }
        }
        if (!j++) break;
        λ0 = λ, sinφ0 = sinφ, cosφ0 = cosφ, point0 = point;
      }
    }
    return (polarAngle < -ε || polarAngle < ε && d3_geo_areaRingSum < 0) ^ winding & 1;
  }
  function d3_geo_clipCircle(radius) {
    var cr = Math.cos(radius), smallRadius = cr > 0, notHemisphere = abs(cr) > ε, interpolate = d3_geo_circleInterpolate(radius, 6 * d3_radians);
    return d3_geo_clip(visible, clipLine, interpolate, smallRadius ? [ 0, -radius ] : [ -π, radius - π ]);
    function visible(λ, φ) {
      return Math.cos(λ) * Math.cos(φ) > cr;
    }
    function clipLine(listener) {
      var point0, c0, v0, v00, clean;
      return {
        lineStart: function() {
          v00 = v0 = false;
          clean = 1;
        },
        point: function(λ, φ) {
          var point1 = [ λ, φ ], point2, v = visible(λ, φ), c = smallRadius ? v ? 0 : code(λ, φ) : v ? code(λ + (λ < 0 ? π : -π), φ) : 0;
          if (!point0 && (v00 = v0 = v)) listener.lineStart();
          if (v !== v0) {
            point2 = intersect(point0, point1);
            if (d3_geo_sphericalEqual(point0, point2) || d3_geo_sphericalEqual(point1, point2)) {
              point1[0] += ε;
              point1[1] += ε;
              v = visible(point1[0], point1[1]);
            }
          }
          if (v !== v0) {
            clean = 0;
            if (v) {
              listener.lineStart();
              point2 = intersect(point1, point0);
              listener.point(point2[0], point2[1]);
            } else {
              point2 = intersect(point0, point1);
              listener.point(point2[0], point2[1]);
              listener.lineEnd();
            }
            point0 = point2;
          } else if (notHemisphere && point0 && smallRadius ^ v) {
            var t;
            if (!(c & c0) && (t = intersect(point1, point0, true))) {
              clean = 0;
              if (smallRadius) {
                listener.lineStart();
                listener.point(t[0][0], t[0][1]);
                listener.point(t[1][0], t[1][1]);
                listener.lineEnd();
              } else {
                listener.point(t[1][0], t[1][1]);
                listener.lineEnd();
                listener.lineStart();
                listener.point(t[0][0], t[0][1]);
              }
            }
          }
          if (v && (!point0 || !d3_geo_sphericalEqual(point0, point1))) {
            listener.point(point1[0], point1[1]);
          }
          point0 = point1, v0 = v, c0 = c;
        },
        lineEnd: function() {
          if (v0) listener.lineEnd();
          point0 = null;
        },
        clean: function() {
          return clean | (v00 && v0) << 1;
        }
      };
    }
    function intersect(a, b, two) {
      var pa = d3_geo_cartesian(a), pb = d3_geo_cartesian(b);
      var n1 = [ 1, 0, 0 ], n2 = d3_geo_cartesianCross(pa, pb), n2n2 = d3_geo_cartesianDot(n2, n2), n1n2 = n2[0], determinant = n2n2 - n1n2 * n1n2;
      if (!determinant) return !two && a;
      var c1 = cr * n2n2 / determinant, c2 = -cr * n1n2 / determinant, n1xn2 = d3_geo_cartesianCross(n1, n2), A = d3_geo_cartesianScale(n1, c1), B = d3_geo_cartesianScale(n2, c2);
      d3_geo_cartesianAdd(A, B);
      var u = n1xn2, w = d3_geo_cartesianDot(A, u), uu = d3_geo_cartesianDot(u, u), t2 = w * w - uu * (d3_geo_cartesianDot(A, A) - 1);
      if (t2 < 0) return;
      var t = Math.sqrt(t2), q = d3_geo_cartesianScale(u, (-w - t) / uu);
      d3_geo_cartesianAdd(q, A);
      q = d3_geo_spherical(q);
      if (!two) return q;
      var λ0 = a[0], λ1 = b[0], φ0 = a[1], φ1 = b[1], z;
      if (λ1 < λ0) z = λ0, λ0 = λ1, λ1 = z;
      var δλ = λ1 - λ0, polar = abs(δλ - π) < ε, meridian = polar || δλ < ε;
      if (!polar && φ1 < φ0) z = φ0, φ0 = φ1, φ1 = z;
      if (meridian ? polar ? φ0 + φ1 > 0 ^ q[1] < (abs(q[0] - λ0) < ε ? φ0 : φ1) : φ0 <= q[1] && q[1] <= φ1 : δλ > π ^ (λ0 <= q[0] && q[0] <= λ1)) {
        var q1 = d3_geo_cartesianScale(u, (-w + t) / uu);
        d3_geo_cartesianAdd(q1, A);
        return [ q, d3_geo_spherical(q1) ];
      }
    }
    function code(λ, φ) {
      var r = smallRadius ? radius : π - radius, code = 0;
      if (λ < -r) code |= 1; else if (λ > r) code |= 2;
      if (φ < -r) code |= 4; else if (φ > r) code |= 8;
      return code;
    }
  }
  function d3_geom_clipLine(x0, y0, x1, y1) {
    return function(line) {
      var a = line.a, b = line.b, ax = a.x, ay = a.y, bx = b.x, by = b.y, t0 = 0, t1 = 1, dx = bx - ax, dy = by - ay, r;
      r = x0 - ax;
      if (!dx && r > 0) return;
      r /= dx;
      if (dx < 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      } else if (dx > 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      }
      r = x1 - ax;
      if (!dx && r < 0) return;
      r /= dx;
      if (dx < 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      } else if (dx > 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      }
      r = y0 - ay;
      if (!dy && r > 0) return;
      r /= dy;
      if (dy < 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      } else if (dy > 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      }
      r = y1 - ay;
      if (!dy && r < 0) return;
      r /= dy;
      if (dy < 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      } else if (dy > 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      }
      if (t0 > 0) line.a = {
        x: ax + t0 * dx,
        y: ay + t0 * dy
      };
      if (t1 < 1) line.b = {
        x: ax + t1 * dx,
        y: ay + t1 * dy
      };
      return line;
    };
  }
  var d3_geo_clipExtentMAX = 1e9;
  d3.geo.clipExtent = function() {
    var x0, y0, x1, y1, stream, clip, clipExtent = {
      stream: function(output) {
        if (stream) stream.valid = false;
        stream = clip(output);
        stream.valid = true;
        return stream;
      },
      extent: function(_) {
        if (!arguments.length) return [ [ x0, y0 ], [ x1, y1 ] ];
        clip = d3_geo_clipExtent(x0 = +_[0][0], y0 = +_[0][1], x1 = +_[1][0], y1 = +_[1][1]);
        if (stream) stream.valid = false, stream = null;
        return clipExtent;
      }
    };
    return clipExtent.extent([ [ 0, 0 ], [ 960, 500 ] ]);
  };
  function d3_geo_clipExtent(x0, y0, x1, y1) {
    return function(listener) {
      var listener_ = listener, bufferListener = d3_geo_clipBufferListener(), clipLine = d3_geom_clipLine(x0, y0, x1, y1), segments, polygon, ring;
      var clip = {
        point: point,
        lineStart: lineStart,
        lineEnd: lineEnd,
        polygonStart: function() {
          listener = bufferListener;
          segments = [];
          polygon = [];
          clean = true;
        },
        polygonEnd: function() {
          listener = listener_;
          segments = d3.merge(segments);
          var clipStartInside = insidePolygon([ x0, y1 ]), inside = clean && clipStartInside, visible = segments.length;
          if (inside || visible) {
            listener.polygonStart();
            if (inside) {
              listener.lineStart();
              interpolate(null, null, 1, listener);
              listener.lineEnd();
            }
            if (visible) {
              d3_geo_clipPolygon(segments, compare, clipStartInside, interpolate, listener);
            }
            listener.polygonEnd();
          }
          segments = polygon = ring = null;
        }
      };
      function insidePolygon(p) {
        var wn = 0, n = polygon.length, y = p[1];
        for (var i = 0; i < n; ++i) {
          for (var j = 1, v = polygon[i], m = v.length, a = v[0], b; j < m; ++j) {
            b = v[j];
            if (a[1] <= y) {
              if (b[1] > y && d3_cross2d(a, b, p) > 0) ++wn;
            } else {
              if (b[1] <= y && d3_cross2d(a, b, p) < 0) --wn;
            }
            a = b;
          }
        }
        return wn !== 0;
      }
      function interpolate(from, to, direction, listener) {
        var a = 0, a1 = 0;
        if (from == null || (a = corner(from, direction)) !== (a1 = corner(to, direction)) || comparePoints(from, to) < 0 ^ direction > 0) {
          do {
            listener.point(a === 0 || a === 3 ? x0 : x1, a > 1 ? y1 : y0);
          } while ((a = (a + direction + 4) % 4) !== a1);
        } else {
          listener.point(to[0], to[1]);
        }
      }
      function pointVisible(x, y) {
        return x0 <= x && x <= x1 && y0 <= y && y <= y1;
      }
      function point(x, y) {
        if (pointVisible(x, y)) listener.point(x, y);
      }
      var x__, y__, v__, x_, y_, v_, first, clean;
      function lineStart() {
        clip.point = linePoint;
        if (polygon) polygon.push(ring = []);
        first = true;
        v_ = false;
        x_ = y_ = NaN;
      }
      function lineEnd() {
        if (segments) {
          linePoint(x__, y__);
          if (v__ && v_) bufferListener.rejoin();
          segments.push(bufferListener.buffer());
        }
        clip.point = point;
        if (v_) listener.lineEnd();
      }
      function linePoint(x, y) {
        x = Math.max(-d3_geo_clipExtentMAX, Math.min(d3_geo_clipExtentMAX, x));
        y = Math.max(-d3_geo_clipExtentMAX, Math.min(d3_geo_clipExtentMAX, y));
        var v = pointVisible(x, y);
        if (polygon) ring.push([ x, y ]);
        if (first) {
          x__ = x, y__ = y, v__ = v;
          first = false;
          if (v) {
            listener.lineStart();
            listener.point(x, y);
          }
        } else {
          if (v && v_) listener.point(x, y); else {
            var l = {
              a: {
                x: x_,
                y: y_
              },
              b: {
                x: x,
                y: y
              }
            };
            if (clipLine(l)) {
              if (!v_) {
                listener.lineStart();
                listener.point(l.a.x, l.a.y);
              }
              listener.point(l.b.x, l.b.y);
              if (!v) listener.lineEnd();
              clean = false;
            } else if (v) {
              listener.lineStart();
              listener.point(x, y);
              clean = false;
            }
          }
        }
        x_ = x, y_ = y, v_ = v;
      }
      return clip;
    };
    function corner(p, direction) {
      return abs(p[0] - x0) < ε ? direction > 0 ? 0 : 3 : abs(p[0] - x1) < ε ? direction > 0 ? 2 : 1 : abs(p[1] - y0) < ε ? direction > 0 ? 1 : 0 : direction > 0 ? 3 : 2;
    }
    function compare(a, b) {
      return comparePoints(a.x, b.x);
    }
    function comparePoints(a, b) {
      var ca = corner(a, 1), cb = corner(b, 1);
      return ca !== cb ? ca - cb : ca === 0 ? b[1] - a[1] : ca === 1 ? a[0] - b[0] : ca === 2 ? a[1] - b[1] : b[0] - a[0];
    }
  }
  function d3_geo_conic(projectAt) {
    var φ0 = 0, φ1 = π / 3, m = d3_geo_projectionMutator(projectAt), p = m(φ0, φ1);
    p.parallels = function(_) {
      if (!arguments.length) return [ φ0 / π * 180, φ1 / π * 180 ];
      return m(φ0 = _[0] * π / 180, φ1 = _[1] * π / 180);
    };
    return p;
  }
  function d3_geo_conicEqualArea(φ0, φ1) {
    var sinφ0 = Math.sin(φ0), n = (sinφ0 + Math.sin(φ1)) / 2, C = 1 + sinφ0 * (2 * n - sinφ0), ρ0 = Math.sqrt(C) / n;
    function forward(λ, φ) {
      var ρ = Math.sqrt(C - 2 * n * Math.sin(φ)) / n;
      return [ ρ * Math.sin(λ *= n), ρ0 - ρ * Math.cos(λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = ρ0 - y;
      return [ Math.atan2(x, ρ0_y) / n, d3_asin((C - (x * x + ρ0_y * ρ0_y) * n * n) / (2 * n)) ];
    };
    return forward;
  }
  (d3.geo.conicEqualArea = function() {
    return d3_geo_conic(d3_geo_conicEqualArea);
  }).raw = d3_geo_conicEqualArea;
  d3.geo.albers = function() {
    return d3.geo.conicEqualArea().rotate([ 96, 0 ]).center([ -.6, 38.7 ]).parallels([ 29.5, 45.5 ]).scale(1070);
  };
  d3.geo.albersUsa = function() {
    var lower48 = d3.geo.albers();
    var alaska = d3.geo.conicEqualArea().rotate([ 154, 0 ]).center([ -2, 58.5 ]).parallels([ 55, 65 ]);
    var hawaii = d3.geo.conicEqualArea().rotate([ 157, 0 ]).center([ -3, 19.9 ]).parallels([ 8, 18 ]);
    var point, pointStream = {
      point: function(x, y) {
        point = [ x, y ];
      }
    }, lower48Point, alaskaPoint, hawaiiPoint;
    function albersUsa(coordinates) {
      var x = coordinates[0], y = coordinates[1];
      point = null;
      (lower48Point(x, y), point) || (alaskaPoint(x, y), point) || hawaiiPoint(x, y);
      return point;
    }
    albersUsa.invert = function(coordinates) {
      var k = lower48.scale(), t = lower48.translate(), x = (coordinates[0] - t[0]) / k, y = (coordinates[1] - t[1]) / k;
      return (y >= .12 && y < .234 && x >= -.425 && x < -.214 ? alaska : y >= .166 && y < .234 && x >= -.214 && x < -.115 ? hawaii : lower48).invert(coordinates);
    };
    albersUsa.stream = function(stream) {
      var lower48Stream = lower48.stream(stream), alaskaStream = alaska.stream(stream), hawaiiStream = hawaii.stream(stream);
      return {
        point: function(x, y) {
          lower48Stream.point(x, y);
          alaskaStream.point(x, y);
          hawaiiStream.point(x, y);
        },
        sphere: function() {
          lower48Stream.sphere();
          alaskaStream.sphere();
          hawaiiStream.sphere();
        },
        lineStart: function() {
          lower48Stream.lineStart();
          alaskaStream.lineStart();
          hawaiiStream.lineStart();
        },
        lineEnd: function() {
          lower48Stream.lineEnd();
          alaskaStream.lineEnd();
          hawaiiStream.lineEnd();
        },
        polygonStart: function() {
          lower48Stream.polygonStart();
          alaskaStream.polygonStart();
          hawaiiStream.polygonStart();
        },
        polygonEnd: function() {
          lower48Stream.polygonEnd();
          alaskaStream.polygonEnd();
          hawaiiStream.polygonEnd();
        }
      };
    };
    albersUsa.precision = function(_) {
      if (!arguments.length) return lower48.precision();
      lower48.precision(_);
      alaska.precision(_);
      hawaii.precision(_);
      return albersUsa;
    };
    albersUsa.scale = function(_) {
      if (!arguments.length) return lower48.scale();
      lower48.scale(_);
      alaska.scale(_ * .35);
      hawaii.scale(_);
      return albersUsa.translate(lower48.translate());
    };
    albersUsa.translate = function(_) {
      if (!arguments.length) return lower48.translate();
      var k = lower48.scale(), x = +_[0], y = +_[1];
      lower48Point = lower48.translate(_).clipExtent([ [ x - .455 * k, y - .238 * k ], [ x + .455 * k, y + .238 * k ] ]).stream(pointStream).point;
      alaskaPoint = alaska.translate([ x - .307 * k, y + .201 * k ]).clipExtent([ [ x - .425 * k + ε, y + .12 * k + ε ], [ x - .214 * k - ε, y + .234 * k - ε ] ]).stream(pointStream).point;
      hawaiiPoint = hawaii.translate([ x - .205 * k, y + .212 * k ]).clipExtent([ [ x - .214 * k + ε, y + .166 * k + ε ], [ x - .115 * k - ε, y + .234 * k - ε ] ]).stream(pointStream).point;
      return albersUsa;
    };
    return albersUsa.scale(1070);
  };
  var d3_geo_pathAreaSum, d3_geo_pathAreaPolygon, d3_geo_pathArea = {
    point: d3_noop,
    lineStart: d3_noop,
    lineEnd: d3_noop,
    polygonStart: function() {
      d3_geo_pathAreaPolygon = 0;
      d3_geo_pathArea.lineStart = d3_geo_pathAreaRingStart;
    },
    polygonEnd: function() {
      d3_geo_pathArea.lineStart = d3_geo_pathArea.lineEnd = d3_geo_pathArea.point = d3_noop;
      d3_geo_pathAreaSum += abs(d3_geo_pathAreaPolygon / 2);
    }
  };
  function d3_geo_pathAreaRingStart() {
    var x00, y00, x0, y0;
    d3_geo_pathArea.point = function(x, y) {
      d3_geo_pathArea.point = nextPoint;
      x00 = x0 = x, y00 = y0 = y;
    };
    function nextPoint(x, y) {
      d3_geo_pathAreaPolygon += y0 * x - x0 * y;
      x0 = x, y0 = y;
    }
    d3_geo_pathArea.lineEnd = function() {
      nextPoint(x00, y00);
    };
  }
  var d3_geo_pathBoundsX0, d3_geo_pathBoundsY0, d3_geo_pathBoundsX1, d3_geo_pathBoundsY1;
  var d3_geo_pathBounds = {
    point: d3_geo_pathBoundsPoint,
    lineStart: d3_noop,
    lineEnd: d3_noop,
    polygonStart: d3_noop,
    polygonEnd: d3_noop
  };
  function d3_geo_pathBoundsPoint(x, y) {
    if (x < d3_geo_pathBoundsX0) d3_geo_pathBoundsX0 = x;
    if (x > d3_geo_pathBoundsX1) d3_geo_pathBoundsX1 = x;
    if (y < d3_geo_pathBoundsY0) d3_geo_pathBoundsY0 = y;
    if (y > d3_geo_pathBoundsY1) d3_geo_pathBoundsY1 = y;
  }
  function d3_geo_pathBuffer() {
    var pointCircle = d3_geo_pathBufferCircle(4.5), buffer = [];
    var stream = {
      point: point,
      lineStart: function() {
        stream.point = pointLineStart;
      },
      lineEnd: lineEnd,
      polygonStart: function() {
        stream.lineEnd = lineEndPolygon;
      },
      polygonEnd: function() {
        stream.lineEnd = lineEnd;
        stream.point = point;
      },
      pointRadius: function(_) {
        pointCircle = d3_geo_pathBufferCircle(_);
        return stream;
      },
      result: function() {
        if (buffer.length) {
          var result = buffer.join("");
          buffer = [];
          return result;
        }
      }
    };
    function point(x, y) {
      buffer.push("M", x, ",", y, pointCircle);
    }
    function pointLineStart(x, y) {
      buffer.push("M", x, ",", y);
      stream.point = pointLine;
    }
    function pointLine(x, y) {
      buffer.push("L", x, ",", y);
    }
    function lineEnd() {
      stream.point = point;
    }
    function lineEndPolygon() {
      buffer.push("Z");
    }
    return stream;
  }
  function d3_geo_pathBufferCircle(radius) {
    return "m0," + radius + "a" + radius + "," + radius + " 0 1,1 0," + -2 * radius + "a" + radius + "," + radius + " 0 1,1 0," + 2 * radius + "z";
  }
  var d3_geo_pathCentroid = {
    point: d3_geo_pathCentroidPoint,
    lineStart: d3_geo_pathCentroidLineStart,
    lineEnd: d3_geo_pathCentroidLineEnd,
    polygonStart: function() {
      d3_geo_pathCentroid.lineStart = d3_geo_pathCentroidRingStart;
    },
    polygonEnd: function() {
      d3_geo_pathCentroid.point = d3_geo_pathCentroidPoint;
      d3_geo_pathCentroid.lineStart = d3_geo_pathCentroidLineStart;
      d3_geo_pathCentroid.lineEnd = d3_geo_pathCentroidLineEnd;
    }
  };
  function d3_geo_pathCentroidPoint(x, y) {
    d3_geo_centroidX0 += x;
    d3_geo_centroidY0 += y;
    ++d3_geo_centroidZ0;
  }
  function d3_geo_pathCentroidLineStart() {
    var x0, y0;
    d3_geo_pathCentroid.point = function(x, y) {
      d3_geo_pathCentroid.point = nextPoint;
      d3_geo_pathCentroidPoint(x0 = x, y0 = y);
    };
    function nextPoint(x, y) {
      var dx = x - x0, dy = y - y0, z = Math.sqrt(dx * dx + dy * dy);
      d3_geo_centroidX1 += z * (x0 + x) / 2;
      d3_geo_centroidY1 += z * (y0 + y) / 2;
      d3_geo_centroidZ1 += z;
      d3_geo_pathCentroidPoint(x0 = x, y0 = y);
    }
  }
  function d3_geo_pathCentroidLineEnd() {
    d3_geo_pathCentroid.point = d3_geo_pathCentroidPoint;
  }
  function d3_geo_pathCentroidRingStart() {
    var x00, y00, x0, y0;
    d3_geo_pathCentroid.point = function(x, y) {
      d3_geo_pathCentroid.point = nextPoint;
      d3_geo_pathCentroidPoint(x00 = x0 = x, y00 = y0 = y);
    };
    function nextPoint(x, y) {
      var dx = x - x0, dy = y - y0, z = Math.sqrt(dx * dx + dy * dy);
      d3_geo_centroidX1 += z * (x0 + x) / 2;
      d3_geo_centroidY1 += z * (y0 + y) / 2;
      d3_geo_centroidZ1 += z;
      z = y0 * x - x0 * y;
      d3_geo_centroidX2 += z * (x0 + x);
      d3_geo_centroidY2 += z * (y0 + y);
      d3_geo_centroidZ2 += z * 3;
      d3_geo_pathCentroidPoint(x0 = x, y0 = y);
    }
    d3_geo_pathCentroid.lineEnd = function() {
      nextPoint(x00, y00);
    };
  }
  function d3_geo_pathContext(context) {
    var pointRadius = 4.5;
    var stream = {
      point: point,
      lineStart: function() {
        stream.point = pointLineStart;
      },
      lineEnd: lineEnd,
      polygonStart: function() {
        stream.lineEnd = lineEndPolygon;
      },
      polygonEnd: function() {
        stream.lineEnd = lineEnd;
        stream.point = point;
      },
      pointRadius: function(_) {
        pointRadius = _;
        return stream;
      },
      result: d3_noop
    };
    function point(x, y) {
      context.moveTo(x + pointRadius, y);
      context.arc(x, y, pointRadius, 0, τ);
    }
    function pointLineStart(x, y) {
      context.moveTo(x, y);
      stream.point = pointLine;
    }
    function pointLine(x, y) {
      context.lineTo(x, y);
    }
    function lineEnd() {
      stream.point = point;
    }
    function lineEndPolygon() {
      context.closePath();
    }
    return stream;
  }
  function d3_geo_resample(project) {
    var δ2 = .5, cosMinDistance = Math.cos(30 * d3_radians), maxDepth = 16;
    function resample(stream) {
      return (maxDepth ? resampleRecursive : resampleNone)(stream);
    }
    function resampleNone(stream) {
      return d3_geo_transformPoint(stream, function(x, y) {
        x = project(x, y);
        stream.point(x[0], x[1]);
      });
    }
    function resampleRecursive(stream) {
      var λ00, φ00, x00, y00, a00, b00, c00, λ0, x0, y0, a0, b0, c0;
      var resample = {
        point: point,
        lineStart: lineStart,
        lineEnd: lineEnd,
        polygonStart: function() {
          stream.polygonStart();
          resample.lineStart = ringStart;
        },
        polygonEnd: function() {
          stream.polygonEnd();
          resample.lineStart = lineStart;
        }
      };
      function point(x, y) {
        x = project(x, y);
        stream.point(x[0], x[1]);
      }
      function lineStart() {
        x0 = NaN;
        resample.point = linePoint;
        stream.lineStart();
      }
      function linePoint(λ, φ) {
        var c = d3_geo_cartesian([ λ, φ ]), p = project(λ, φ);
        resampleLineTo(x0, y0, λ0, a0, b0, c0, x0 = p[0], y0 = p[1], λ0 = λ, a0 = c[0], b0 = c[1], c0 = c[2], maxDepth, stream);
        stream.point(x0, y0);
      }
      function lineEnd() {
        resample.point = point;
        stream.lineEnd();
      }
      function ringStart() {
        lineStart();
        resample.point = ringPoint;
        resample.lineEnd = ringEnd;
      }
      function ringPoint(λ, φ) {
        linePoint(λ00 = λ, φ00 = φ), x00 = x0, y00 = y0, a00 = a0, b00 = b0, c00 = c0;
        resample.point = linePoint;
      }
      function ringEnd() {
        resampleLineTo(x0, y0, λ0, a0, b0, c0, x00, y00, λ00, a00, b00, c00, maxDepth, stream);
        resample.lineEnd = lineEnd;
        lineEnd();
      }
      return resample;
    }
    function resampleLineTo(x0, y0, λ0, a0, b0, c0, x1, y1, λ1, a1, b1, c1, depth, stream) {
      var dx = x1 - x0, dy = y1 - y0, d2 = dx * dx + dy * dy;
      if (d2 > 4 * δ2 && depth--) {
        var a = a0 + a1, b = b0 + b1, c = c0 + c1, m = Math.sqrt(a * a + b * b + c * c), φ2 = Math.asin(c /= m), λ2 = abs(abs(c) - 1) < ε || abs(λ0 - λ1) < ε ? (λ0 + λ1) / 2 : Math.atan2(b, a), p = project(λ2, φ2), x2 = p[0], y2 = p[1], dx2 = x2 - x0, dy2 = y2 - y0, dz = dy * dx2 - dx * dy2;
        if (dz * dz / d2 > δ2 || abs((dx * dx2 + dy * dy2) / d2 - .5) > .3 || a0 * a1 + b0 * b1 + c0 * c1 < cosMinDistance) {
          resampleLineTo(x0, y0, λ0, a0, b0, c0, x2, y2, λ2, a /= m, b /= m, c, depth, stream);
          stream.point(x2, y2);
          resampleLineTo(x2, y2, λ2, a, b, c, x1, y1, λ1, a1, b1, c1, depth, stream);
        }
      }
    }
    resample.precision = function(_) {
      if (!arguments.length) return Math.sqrt(δ2);
      maxDepth = (δ2 = _ * _) > 0 && 16;
      return resample;
    };
    return resample;
  }
  d3.geo.path = function() {
    var pointRadius = 4.5, projection, context, projectStream, contextStream, cacheStream;
    function path(object) {
      if (object) {
        if (typeof pointRadius === "function") contextStream.pointRadius(+pointRadius.apply(this, arguments));
        if (!cacheStream || !cacheStream.valid) cacheStream = projectStream(contextStream);
        d3.geo.stream(object, cacheStream);
      }
      return contextStream.result();
    }
    path.area = function(object) {
      d3_geo_pathAreaSum = 0;
      d3.geo.stream(object, projectStream(d3_geo_pathArea));
      return d3_geo_pathAreaSum;
    };
    path.centroid = function(object) {
      d3_geo_centroidX0 = d3_geo_centroidY0 = d3_geo_centroidZ0 = d3_geo_centroidX1 = d3_geo_centroidY1 = d3_geo_centroidZ1 = d3_geo_centroidX2 = d3_geo_centroidY2 = d3_geo_centroidZ2 = 0;
      d3.geo.stream(object, projectStream(d3_geo_pathCentroid));
      return d3_geo_centroidZ2 ? [ d3_geo_centroidX2 / d3_geo_centroidZ2, d3_geo_centroidY2 / d3_geo_centroidZ2 ] : d3_geo_centroidZ1 ? [ d3_geo_centroidX1 / d3_geo_centroidZ1, d3_geo_centroidY1 / d3_geo_centroidZ1 ] : d3_geo_centroidZ0 ? [ d3_geo_centroidX0 / d3_geo_centroidZ0, d3_geo_centroidY0 / d3_geo_centroidZ0 ] : [ NaN, NaN ];
    };
    path.bounds = function(object) {
      d3_geo_pathBoundsX1 = d3_geo_pathBoundsY1 = -(d3_geo_pathBoundsX0 = d3_geo_pathBoundsY0 = Infinity);
      d3.geo.stream(object, projectStream(d3_geo_pathBounds));
      return [ [ d3_geo_pathBoundsX0, d3_geo_pathBoundsY0 ], [ d3_geo_pathBoundsX1, d3_geo_pathBoundsY1 ] ];
    };
    path.projection = function(_) {
      if (!arguments.length) return projection;
      projectStream = (projection = _) ? _.stream || d3_geo_pathProjectStream(_) : d3_identity;
      return reset();
    };
    path.context = function(_) {
      if (!arguments.length) return context;
      contextStream = (context = _) == null ? new d3_geo_pathBuffer() : new d3_geo_pathContext(_);
      if (typeof pointRadius !== "function") contextStream.pointRadius(pointRadius);
      return reset();
    };
    path.pointRadius = function(_) {
      if (!arguments.length) return pointRadius;
      pointRadius = typeof _ === "function" ? _ : (contextStream.pointRadius(+_), +_);
      return path;
    };
    function reset() {
      cacheStream = null;
      return path;
    }
    return path.projection(d3.geo.albersUsa()).context(null);
  };
  function d3_geo_pathProjectStream(project) {
    var resample = d3_geo_resample(function(x, y) {
      return project([ x * d3_degrees, y * d3_degrees ]);
    });
    return function(stream) {
      return d3_geo_projectionRadians(resample(stream));
    };
  }
  d3.geo.transform = function(methods) {
    return {
      stream: function(stream) {
        var transform = new d3_geo_transform(stream);
        for (var k in methods) transform[k] = methods[k];
        return transform;
      }
    };
  };
  function d3_geo_transform(stream) {
    this.stream = stream;
  }
  d3_geo_transform.prototype = {
    point: function(x, y) {
      this.stream.point(x, y);
    },
    sphere: function() {
      this.stream.sphere();
    },
    lineStart: function() {
      this.stream.lineStart();
    },
    lineEnd: function() {
      this.stream.lineEnd();
    },
    polygonStart: function() {
      this.stream.polygonStart();
    },
    polygonEnd: function() {
      this.stream.polygonEnd();
    }
  };
  function d3_geo_transformPoint(stream, point) {
    return {
      point: point,
      sphere: function() {
        stream.sphere();
      },
      lineStart: function() {
        stream.lineStart();
      },
      lineEnd: function() {
        stream.lineEnd();
      },
      polygonStart: function() {
        stream.polygonStart();
      },
      polygonEnd: function() {
        stream.polygonEnd();
      }
    };
  }
  d3.geo.projection = d3_geo_projection;
  d3.geo.projectionMutator = d3_geo_projectionMutator;
  function d3_geo_projection(project) {
    return d3_geo_projectionMutator(function() {
      return project;
    })();
  }
  function d3_geo_projectionMutator(projectAt) {
    var project, rotate, projectRotate, projectResample = d3_geo_resample(function(x, y) {
      x = project(x, y);
      return [ x[0] * k + δx, δy - x[1] * k ];
    }), k = 150, x = 480, y = 250, λ = 0, φ = 0, δλ = 0, δφ = 0, δγ = 0, δx, δy, preclip = d3_geo_clipAntimeridian, postclip = d3_identity, clipAngle = null, clipExtent = null, stream;
    function projection(point) {
      point = projectRotate(point[0] * d3_radians, point[1] * d3_radians);
      return [ point[0] * k + δx, δy - point[1] * k ];
    }
    function invert(point) {
      point = projectRotate.invert((point[0] - δx) / k, (δy - point[1]) / k);
      return point && [ point[0] * d3_degrees, point[1] * d3_degrees ];
    }
    projection.stream = function(output) {
      if (stream) stream.valid = false;
      stream = d3_geo_projectionRadians(preclip(rotate, projectResample(postclip(output))));
      stream.valid = true;
      return stream;
    };
    projection.clipAngle = function(_) {
      if (!arguments.length) return clipAngle;
      preclip = _ == null ? (clipAngle = _, d3_geo_clipAntimeridian) : d3_geo_clipCircle((clipAngle = +_) * d3_radians);
      return invalidate();
    };
    projection.clipExtent = function(_) {
      if (!arguments.length) return clipExtent;
      clipExtent = _;
      postclip = _ ? d3_geo_clipExtent(_[0][0], _[0][1], _[1][0], _[1][1]) : d3_identity;
      return invalidate();
    };
    projection.scale = function(_) {
      if (!arguments.length) return k;
      k = +_;
      return reset();
    };
    projection.translate = function(_) {
      if (!arguments.length) return [ x, y ];
      x = +_[0];
      y = +_[1];
      return reset();
    };
    projection.center = function(_) {
      if (!arguments.length) return [ λ * d3_degrees, φ * d3_degrees ];
      λ = _[0] % 360 * d3_radians;
      φ = _[1] % 360 * d3_radians;
      return reset();
    };
    projection.rotate = function(_) {
      if (!arguments.length) return [ δλ * d3_degrees, δφ * d3_degrees, δγ * d3_degrees ];
      δλ = _[0] % 360 * d3_radians;
      δφ = _[1] % 360 * d3_radians;
      δγ = _.length > 2 ? _[2] % 360 * d3_radians : 0;
      return reset();
    };
    d3.rebind(projection, projectResample, "precision");
    function reset() {
      projectRotate = d3_geo_compose(rotate = d3_geo_rotation(δλ, δφ, δγ), project);
      var center = project(λ, φ);
      δx = x - center[0] * k;
      δy = y + center[1] * k;
      return invalidate();
    }
    function invalidate() {
      if (stream) stream.valid = false, stream = null;
      return projection;
    }
    return function() {
      project = projectAt.apply(this, arguments);
      projection.invert = project.invert && invert;
      return reset();
    };
  }
  function d3_geo_projectionRadians(stream) {
    return d3_geo_transformPoint(stream, function(x, y) {
      stream.point(x * d3_radians, y * d3_radians);
    });
  }
  function d3_geo_equirectangular(λ, φ) {
    return [ λ, φ ];
  }
  (d3.geo.equirectangular = function() {
    return d3_geo_projection(d3_geo_equirectangular);
  }).raw = d3_geo_equirectangular.invert = d3_geo_equirectangular;
  d3.geo.rotation = function(rotate) {
    rotate = d3_geo_rotation(rotate[0] % 360 * d3_radians, rotate[1] * d3_radians, rotate.length > 2 ? rotate[2] * d3_radians : 0);
    function forward(coordinates) {
      coordinates = rotate(coordinates[0] * d3_radians, coordinates[1] * d3_radians);
      return coordinates[0] *= d3_degrees, coordinates[1] *= d3_degrees, coordinates;
    }
    forward.invert = function(coordinates) {
      coordinates = rotate.invert(coordinates[0] * d3_radians, coordinates[1] * d3_radians);
      return coordinates[0] *= d3_degrees, coordinates[1] *= d3_degrees, coordinates;
    };
    return forward;
  };
  function d3_geo_identityRotation(λ, φ) {
    return [ λ > π ? λ - τ : λ < -π ? λ + τ : λ, φ ];
  }
  d3_geo_identityRotation.invert = d3_geo_equirectangular;
  function d3_geo_rotation(δλ, δφ, δγ) {
    return δλ ? δφ || δγ ? d3_geo_compose(d3_geo_rotationλ(δλ), d3_geo_rotationφγ(δφ, δγ)) : d3_geo_rotationλ(δλ) : δφ || δγ ? d3_geo_rotationφγ(δφ, δγ) : d3_geo_identityRotation;
  }
  function d3_geo_forwardRotationλ(δλ) {
    return function(λ, φ) {
      return λ += δλ, [ λ > π ? λ - τ : λ < -π ? λ + τ : λ, φ ];
    };
  }
  function d3_geo_rotationλ(δλ) {
    var rotation = d3_geo_forwardRotationλ(δλ);
    rotation.invert = d3_geo_forwardRotationλ(-δλ);
    return rotation;
  }
  function d3_geo_rotationφγ(δφ, δγ) {
    var cosδφ = Math.cos(δφ), sinδφ = Math.sin(δφ), cosδγ = Math.cos(δγ), sinδγ = Math.sin(δγ);
    function rotation(λ, φ) {
      var cosφ = Math.cos(φ), x = Math.cos(λ) * cosφ, y = Math.sin(λ) * cosφ, z = Math.sin(φ), k = z * cosδφ + x * sinδφ;
      return [ Math.atan2(y * cosδγ - k * sinδγ, x * cosδφ - z * sinδφ), d3_asin(k * cosδγ + y * sinδγ) ];
    }
    rotation.invert = function(λ, φ) {
      var cosφ = Math.cos(φ), x = Math.cos(λ) * cosφ, y = Math.sin(λ) * cosφ, z = Math.sin(φ), k = z * cosδγ - y * sinδγ;
      return [ Math.atan2(y * cosδγ + z * sinδγ, x * cosδφ + k * sinδφ), d3_asin(k * cosδφ - x * sinδφ) ];
    };
    return rotation;
  }
  d3.geo.circle = function() {
    var origin = [ 0, 0 ], angle, precision = 6, interpolate;
    function circle() {
      var center = typeof origin === "function" ? origin.apply(this, arguments) : origin, rotate = d3_geo_rotation(-center[0] * d3_radians, -center[1] * d3_radians, 0).invert, ring = [];
      interpolate(null, null, 1, {
        point: function(x, y) {
          ring.push(x = rotate(x, y));
          x[0] *= d3_degrees, x[1] *= d3_degrees;
        }
      });
      return {
        type: "Polygon",
        coordinates: [ ring ]
      };
    }
    circle.origin = function(x) {
      if (!arguments.length) return origin;
      origin = x;
      return circle;
    };
    circle.angle = function(x) {
      if (!arguments.length) return angle;
      interpolate = d3_geo_circleInterpolate((angle = +x) * d3_radians, precision * d3_radians);
      return circle;
    };
    circle.precision = function(_) {
      if (!arguments.length) return precision;
      interpolate = d3_geo_circleInterpolate(angle * d3_radians, (precision = +_) * d3_radians);
      return circle;
    };
    return circle.angle(90);
  };
  function d3_geo_circleInterpolate(radius, precision) {
    var cr = Math.cos(radius), sr = Math.sin(radius);
    return function(from, to, direction, listener) {
      var step = direction * precision;
      if (from != null) {
        from = d3_geo_circleAngle(cr, from);
        to = d3_geo_circleAngle(cr, to);
        if (direction > 0 ? from < to : from > to) from += direction * τ;
      } else {
        from = radius + direction * τ;
        to = radius - .5 * step;
      }
      for (var point, t = from; direction > 0 ? t > to : t < to; t -= step) {
        listener.point((point = d3_geo_spherical([ cr, -sr * Math.cos(t), -sr * Math.sin(t) ]))[0], point[1]);
      }
    };
  }
  function d3_geo_circleAngle(cr, point) {
    var a = d3_geo_cartesian(point);
    a[0] -= cr;
    d3_geo_cartesianNormalize(a);
    var angle = d3_acos(-a[1]);
    return ((-a[2] < 0 ? -angle : angle) + 2 * Math.PI - ε) % (2 * Math.PI);
  }
  d3.geo.distance = function(a, b) {
    var Δλ = (b[0] - a[0]) * d3_radians, φ0 = a[1] * d3_radians, φ1 = b[1] * d3_radians, sinΔλ = Math.sin(Δλ), cosΔλ = Math.cos(Δλ), sinφ0 = Math.sin(φ0), cosφ0 = Math.cos(φ0), sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1), t;
    return Math.atan2(Math.sqrt((t = cosφ1 * sinΔλ) * t + (t = cosφ0 * sinφ1 - sinφ0 * cosφ1 * cosΔλ) * t), sinφ0 * sinφ1 + cosφ0 * cosφ1 * cosΔλ);
  };
  d3.geo.graticule = function() {
    var x1, x0, X1, X0, y1, y0, Y1, Y0, dx = 10, dy = dx, DX = 90, DY = 360, x, y, X, Y, precision = 2.5;
    function graticule() {
      return {
        type: "MultiLineString",
        coordinates: lines()
      };
    }
    function lines() {
      return d3.range(Math.ceil(X0 / DX) * DX, X1, DX).map(X).concat(d3.range(Math.ceil(Y0 / DY) * DY, Y1, DY).map(Y)).concat(d3.range(Math.ceil(x0 / dx) * dx, x1, dx).filter(function(x) {
        return abs(x % DX) > ε;
      }).map(x)).concat(d3.range(Math.ceil(y0 / dy) * dy, y1, dy).filter(function(y) {
        return abs(y % DY) > ε;
      }).map(y));
    }
    graticule.lines = function() {
      return lines().map(function(coordinates) {
        return {
          type: "LineString",
          coordinates: coordinates
        };
      });
    };
    graticule.outline = function() {
      return {
        type: "Polygon",
        coordinates: [ X(X0).concat(Y(Y1).slice(1), X(X1).reverse().slice(1), Y(Y0).reverse().slice(1)) ]
      };
    };
    graticule.extent = function(_) {
      if (!arguments.length) return graticule.minorExtent();
      return graticule.majorExtent(_).minorExtent(_);
    };
    graticule.majorExtent = function(_) {
      if (!arguments.length) return [ [ X0, Y0 ], [ X1, Y1 ] ];
      X0 = +_[0][0], X1 = +_[1][0];
      Y0 = +_[0][1], Y1 = +_[1][1];
      if (X0 > X1) _ = X0, X0 = X1, X1 = _;
      if (Y0 > Y1) _ = Y0, Y0 = Y1, Y1 = _;
      return graticule.precision(precision);
    };
    graticule.minorExtent = function(_) {
      if (!arguments.length) return [ [ x0, y0 ], [ x1, y1 ] ];
      x0 = +_[0][0], x1 = +_[1][0];
      y0 = +_[0][1], y1 = +_[1][1];
      if (x0 > x1) _ = x0, x0 = x1, x1 = _;
      if (y0 > y1) _ = y0, y0 = y1, y1 = _;
      return graticule.precision(precision);
    };
    graticule.step = function(_) {
      if (!arguments.length) return graticule.minorStep();
      return graticule.majorStep(_).minorStep(_);
    };
    graticule.majorStep = function(_) {
      if (!arguments.length) return [ DX, DY ];
      DX = +_[0], DY = +_[1];
      return graticule;
    };
    graticule.minorStep = function(_) {
      if (!arguments.length) return [ dx, dy ];
      dx = +_[0], dy = +_[1];
      return graticule;
    };
    graticule.precision = function(_) {
      if (!arguments.length) return precision;
      precision = +_;
      x = d3_geo_graticuleX(y0, y1, 90);
      y = d3_geo_graticuleY(x0, x1, precision);
      X = d3_geo_graticuleX(Y0, Y1, 90);
      Y = d3_geo_graticuleY(X0, X1, precision);
      return graticule;
    };
    return graticule.majorExtent([ [ -180, -90 + ε ], [ 180, 90 - ε ] ]).minorExtent([ [ -180, -80 - ε ], [ 180, 80 + ε ] ]);
  };
  function d3_geo_graticuleX(y0, y1, dy) {
    var y = d3.range(y0, y1 - ε, dy).concat(y1);
    return function(x) {
      return y.map(function(y) {
        return [ x, y ];
      });
    };
  }
  function d3_geo_graticuleY(x0, x1, dx) {
    var x = d3.range(x0, x1 - ε, dx).concat(x1);
    return function(y) {
      return x.map(function(x) {
        return [ x, y ];
      });
    };
  }
  function d3_source(d) {
    return d.source;
  }
  function d3_target(d) {
    return d.target;
  }
  d3.geo.greatArc = function() {
    var source = d3_source, source_, target = d3_target, target_;
    function greatArc() {
      return {
        type: "LineString",
        coordinates: [ source_ || source.apply(this, arguments), target_ || target.apply(this, arguments) ]
      };
    }
    greatArc.distance = function() {
      return d3.geo.distance(source_ || source.apply(this, arguments), target_ || target.apply(this, arguments));
    };
    greatArc.source = function(_) {
      if (!arguments.length) return source;
      source = _, source_ = typeof _ === "function" ? null : _;
      return greatArc;
    };
    greatArc.target = function(_) {
      if (!arguments.length) return target;
      target = _, target_ = typeof _ === "function" ? null : _;
      return greatArc;
    };
    greatArc.precision = function() {
      return arguments.length ? greatArc : 0;
    };
    return greatArc;
  };
  d3.geo.interpolate = function(source, target) {
    return d3_geo_interpolate(source[0] * d3_radians, source[1] * d3_radians, target[0] * d3_radians, target[1] * d3_radians);
  };
  function d3_geo_interpolate(x0, y0, x1, y1) {
    var cy0 = Math.cos(y0), sy0 = Math.sin(y0), cy1 = Math.cos(y1), sy1 = Math.sin(y1), kx0 = cy0 * Math.cos(x0), ky0 = cy0 * Math.sin(x0), kx1 = cy1 * Math.cos(x1), ky1 = cy1 * Math.sin(x1), d = 2 * Math.asin(Math.sqrt(d3_haversin(y1 - y0) + cy0 * cy1 * d3_haversin(x1 - x0))), k = 1 / Math.sin(d);
    var interpolate = d ? function(t) {
      var B = Math.sin(t *= d) * k, A = Math.sin(d - t) * k, x = A * kx0 + B * kx1, y = A * ky0 + B * ky1, z = A * sy0 + B * sy1;
      return [ Math.atan2(y, x) * d3_degrees, Math.atan2(z, Math.sqrt(x * x + y * y)) * d3_degrees ];
    } : function() {
      return [ x0 * d3_degrees, y0 * d3_degrees ];
    };
    interpolate.distance = d;
    return interpolate;
  }
  d3.geo.length = function(object) {
    d3_geo_lengthSum = 0;
    d3.geo.stream(object, d3_geo_length);
    return d3_geo_lengthSum;
  };
  var d3_geo_lengthSum;
  var d3_geo_length = {
    sphere: d3_noop,
    point: d3_noop,
    lineStart: d3_geo_lengthLineStart,
    lineEnd: d3_noop,
    polygonStart: d3_noop,
    polygonEnd: d3_noop
  };
  function d3_geo_lengthLineStart() {
    var λ0, sinφ0, cosφ0;
    d3_geo_length.point = function(λ, φ) {
      λ0 = λ * d3_radians, sinφ0 = Math.sin(φ *= d3_radians), cosφ0 = Math.cos(φ);
      d3_geo_length.point = nextPoint;
    };
    d3_geo_length.lineEnd = function() {
      d3_geo_length.point = d3_geo_length.lineEnd = d3_noop;
    };
    function nextPoint(λ, φ) {
      var sinφ = Math.sin(φ *= d3_radians), cosφ = Math.cos(φ), t = abs((λ *= d3_radians) - λ0), cosΔλ = Math.cos(t);
      d3_geo_lengthSum += Math.atan2(Math.sqrt((t = cosφ * Math.sin(t)) * t + (t = cosφ0 * sinφ - sinφ0 * cosφ * cosΔλ) * t), sinφ0 * sinφ + cosφ0 * cosφ * cosΔλ);
      λ0 = λ, sinφ0 = sinφ, cosφ0 = cosφ;
    }
  }
  function d3_geo_azimuthal(scale, angle) {
    function azimuthal(λ, φ) {
      var cosλ = Math.cos(λ), cosφ = Math.cos(φ), k = scale(cosλ * cosφ);
      return [ k * cosφ * Math.sin(λ), k * Math.sin(φ) ];
    }
    azimuthal.invert = function(x, y) {
      var ρ = Math.sqrt(x * x + y * y), c = angle(ρ), sinc = Math.sin(c), cosc = Math.cos(c);
      return [ Math.atan2(x * sinc, ρ * cosc), Math.asin(ρ && y * sinc / ρ) ];
    };
    return azimuthal;
  }
  var d3_geo_azimuthalEqualArea = d3_geo_azimuthal(function(cosλcosφ) {
    return Math.sqrt(2 / (1 + cosλcosφ));
  }, function(ρ) {
    return 2 * Math.asin(ρ / 2);
  });
  (d3.geo.azimuthalEqualArea = function() {
    return d3_geo_projection(d3_geo_azimuthalEqualArea);
  }).raw = d3_geo_azimuthalEqualArea;
  var d3_geo_azimuthalEquidistant = d3_geo_azimuthal(function(cosλcosφ) {
    var c = Math.acos(cosλcosφ);
    return c && c / Math.sin(c);
  }, d3_identity);
  (d3.geo.azimuthalEquidistant = function() {
    return d3_geo_projection(d3_geo_azimuthalEquidistant);
  }).raw = d3_geo_azimuthalEquidistant;
  function d3_geo_conicConformal(φ0, φ1) {
    var cosφ0 = Math.cos(φ0), t = function(φ) {
      return Math.tan(π / 4 + φ / 2);
    }, n = φ0 === φ1 ? Math.sin(φ0) : Math.log(cosφ0 / Math.cos(φ1)) / Math.log(t(φ1) / t(φ0)), F = cosφ0 * Math.pow(t(φ0), n) / n;
    if (!n) return d3_geo_mercator;
    function forward(λ, φ) {
      if (F > 0) {
        if (φ < -halfπ + ε) φ = -halfπ + ε;
      } else {
        if (φ > halfπ - ε) φ = halfπ - ε;
      }
      var ρ = F / Math.pow(t(φ), n);
      return [ ρ * Math.sin(n * λ), F - ρ * Math.cos(n * λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = F - y, ρ = d3_sgn(n) * Math.sqrt(x * x + ρ0_y * ρ0_y);
      return [ Math.atan2(x, ρ0_y) / n, 2 * Math.atan(Math.pow(F / ρ, 1 / n)) - halfπ ];
    };
    return forward;
  }
  (d3.geo.conicConformal = function() {
    return d3_geo_conic(d3_geo_conicConformal);
  }).raw = d3_geo_conicConformal;
  function d3_geo_conicEquidistant(φ0, φ1) {
    var cosφ0 = Math.cos(φ0), n = φ0 === φ1 ? Math.sin(φ0) : (cosφ0 - Math.cos(φ1)) / (φ1 - φ0), G = cosφ0 / n + φ0;
    if (abs(n) < ε) return d3_geo_equirectangular;
    function forward(λ, φ) {
      var ρ = G - φ;
      return [ ρ * Math.sin(n * λ), G - ρ * Math.cos(n * λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = G - y;
      return [ Math.atan2(x, ρ0_y) / n, G - d3_sgn(n) * Math.sqrt(x * x + ρ0_y * ρ0_y) ];
    };
    return forward;
  }
  (d3.geo.conicEquidistant = function() {
    return d3_geo_conic(d3_geo_conicEquidistant);
  }).raw = d3_geo_conicEquidistant;
  var d3_geo_gnomonic = d3_geo_azimuthal(function(cosλcosφ) {
    return 1 / cosλcosφ;
  }, Math.atan);
  (d3.geo.gnomonic = function() {
    return d3_geo_projection(d3_geo_gnomonic);
  }).raw = d3_geo_gnomonic;
  function d3_geo_mercator(λ, φ) {
    return [ λ, Math.log(Math.tan(π / 4 + φ / 2)) ];
  }
  d3_geo_mercator.invert = function(x, y) {
    return [ x, 2 * Math.atan(Math.exp(y)) - halfπ ];
  };
  function d3_geo_mercatorProjection(project) {
    var m = d3_geo_projection(project), scale = m.scale, translate = m.translate, clipExtent = m.clipExtent, clipAuto;
    m.scale = function() {
      var v = scale.apply(m, arguments);
      return v === m ? clipAuto ? m.clipExtent(null) : m : v;
    };
    m.translate = function() {
      var v = translate.apply(m, arguments);
      return v === m ? clipAuto ? m.clipExtent(null) : m : v;
    };
    m.clipExtent = function(_) {
      var v = clipExtent.apply(m, arguments);
      if (v === m) {
        if (clipAuto = _ == null) {
          var k = π * scale(), t = translate();
          clipExtent([ [ t[0] - k, t[1] - k ], [ t[0] + k, t[1] + k ] ]);
        }
      } else if (clipAuto) {
        v = null;
      }
      return v;
    };
    return m.clipExtent(null);
  }
  (d3.geo.mercator = function() {
    return d3_geo_mercatorProjection(d3_geo_mercator);
  }).raw = d3_geo_mercator;
  var d3_geo_orthographic = d3_geo_azimuthal(function() {
    return 1;
  }, Math.asin);
  (d3.geo.orthographic = function() {
    return d3_geo_projection(d3_geo_orthographic);
  }).raw = d3_geo_orthographic;
  var d3_geo_stereographic = d3_geo_azimuthal(function(cosλcosφ) {
    return 1 / (1 + cosλcosφ);
  }, function(ρ) {
    return 2 * Math.atan(ρ);
  });
  (d3.geo.stereographic = function() {
    return d3_geo_projection(d3_geo_stereographic);
  }).raw = d3_geo_stereographic;
  function d3_geo_transverseMercator(λ, φ) {
    return [ Math.log(Math.tan(π / 4 + φ / 2)), -λ ];
  }
  d3_geo_transverseMercator.invert = function(x, y) {
    return [ -y, 2 * Math.atan(Math.exp(x)) - halfπ ];
  };
  (d3.geo.transverseMercator = function() {
    var projection = d3_geo_mercatorProjection(d3_geo_transverseMercator), center = projection.center, rotate = projection.rotate;
    projection.center = function(_) {
      return _ ? center([ -_[1], _[0] ]) : (_ = center(), [ _[1], -_[0] ]);
    };
    projection.rotate = function(_) {
      return _ ? rotate([ _[0], _[1], _.length > 2 ? _[2] + 90 : 90 ]) : (_ = rotate(), 
      [ _[0], _[1], _[2] - 90 ]);
    };
    return rotate([ 0, 0, 90 ]);
  }).raw = d3_geo_transverseMercator;
  d3.geom = {};
  function d3_geom_pointX(d) {
    return d[0];
  }
  function d3_geom_pointY(d) {
    return d[1];
  }
  d3.geom.hull = function(vertices) {
    var x = d3_geom_pointX, y = d3_geom_pointY;
    if (arguments.length) return hull(vertices);
    function hull(data) {
      if (data.length < 3) return [];
      var fx = d3_functor(x), fy = d3_functor(y), i, n = data.length, points = [], flippedPoints = [];
      for (i = 0; i < n; i++) {
        points.push([ +fx.call(this, data[i], i), +fy.call(this, data[i], i), i ]);
      }
      points.sort(d3_geom_hullOrder);
      for (i = 0; i < n; i++) flippedPoints.push([ points[i][0], -points[i][1] ]);
      var upper = d3_geom_hullUpper(points), lower = d3_geom_hullUpper(flippedPoints);
      var skipLeft = lower[0] === upper[0], skipRight = lower[lower.length - 1] === upper[upper.length - 1], polygon = [];
      for (i = upper.length - 1; i >= 0; --i) polygon.push(data[points[upper[i]][2]]);
      for (i = +skipLeft; i < lower.length - skipRight; ++i) polygon.push(data[points[lower[i]][2]]);
      return polygon;
    }
    hull.x = function(_) {
      return arguments.length ? (x = _, hull) : x;
    };
    hull.y = function(_) {
      return arguments.length ? (y = _, hull) : y;
    };
    return hull;
  };
  function d3_geom_hullUpper(points) {
    var n = points.length, hull = [ 0, 1 ], hs = 2;
    for (var i = 2; i < n; i++) {
      while (hs > 1 && d3_cross2d(points[hull[hs - 2]], points[hull[hs - 1]], points[i]) <= 0) --hs;
      hull[hs++] = i;
    }
    return hull.slice(0, hs);
  }
  function d3_geom_hullOrder(a, b) {
    return a[0] - b[0] || a[1] - b[1];
  }
  d3.geom.polygon = function(coordinates) {
    d3_subclass(coordinates, d3_geom_polygonPrototype);
    return coordinates;
  };
  var d3_geom_polygonPrototype = d3.geom.polygon.prototype = [];
  d3_geom_polygonPrototype.area = function() {
    var i = -1, n = this.length, a, b = this[n - 1], area = 0;
    while (++i < n) {
      a = b;
      b = this[i];
      area += a[1] * b[0] - a[0] * b[1];
    }
    return area * .5;
  };
  d3_geom_polygonPrototype.centroid = function(k) {
    var i = -1, n = this.length, x = 0, y = 0, a, b = this[n - 1], c;
    if (!arguments.length) k = -1 / (6 * this.area());
    while (++i < n) {
      a = b;
      b = this[i];
      c = a[0] * b[1] - b[0] * a[1];
      x += (a[0] + b[0]) * c;
      y += (a[1] + b[1]) * c;
    }
    return [ x * k, y * k ];
  };
  d3_geom_polygonPrototype.clip = function(subject) {
    var input, closed = d3_geom_polygonClosed(subject), i = -1, n = this.length - d3_geom_polygonClosed(this), j, m, a = this[n - 1], b, c, d;
    while (++i < n) {
      input = subject.slice();
      subject.length = 0;
      b = this[i];
      c = input[(m = input.length - closed) - 1];
      j = -1;
      while (++j < m) {
        d = input[j];
        if (d3_geom_polygonInside(d, a, b)) {
          if (!d3_geom_polygonInside(c, a, b)) {
            subject.push(d3_geom_polygonIntersect(c, d, a, b));
          }
          subject.push(d);
        } else if (d3_geom_polygonInside(c, a, b)) {
          subject.push(d3_geom_polygonIntersect(c, d, a, b));
        }
        c = d;
      }
      if (closed) subject.push(subject[0]);
      a = b;
    }
    return subject;
  };
  function d3_geom_polygonInside(p, a, b) {
    return (b[0] - a[0]) * (p[1] - a[1]) < (b[1] - a[1]) * (p[0] - a[0]);
  }
  function d3_geom_polygonIntersect(c, d, a, b) {
    var x1 = c[0], x3 = a[0], x21 = d[0] - x1, x43 = b[0] - x3, y1 = c[1], y3 = a[1], y21 = d[1] - y1, y43 = b[1] - y3, ua = (x43 * (y1 - y3) - y43 * (x1 - x3)) / (y43 * x21 - x43 * y21);
    return [ x1 + ua * x21, y1 + ua * y21 ];
  }
  function d3_geom_polygonClosed(coordinates) {
    var a = coordinates[0], b = coordinates[coordinates.length - 1];
    return !(a[0] - b[0] || a[1] - b[1]);
  }
  var d3_geom_voronoiEdges, d3_geom_voronoiCells, d3_geom_voronoiBeaches, d3_geom_voronoiBeachPool = [], d3_geom_voronoiFirstCircle, d3_geom_voronoiCircles, d3_geom_voronoiCirclePool = [];
  function d3_geom_voronoiBeach() {
    d3_geom_voronoiRedBlackNode(this);
    this.edge = this.site = this.circle = null;
  }
  function d3_geom_voronoiCreateBeach(site) {
    var beach = d3_geom_voronoiBeachPool.pop() || new d3_geom_voronoiBeach();
    beach.site = site;
    return beach;
  }
  function d3_geom_voronoiDetachBeach(beach) {
    d3_geom_voronoiDetachCircle(beach);
    d3_geom_voronoiBeaches.remove(beach);
    d3_geom_voronoiBeachPool.push(beach);
    d3_geom_voronoiRedBlackNode(beach);
  }
  function d3_geom_voronoiRemoveBeach(beach) {
    var circle = beach.circle, x = circle.x, y = circle.cy, vertex = {
      x: x,
      y: y
    }, previous = beach.P, next = beach.N, disappearing = [ beach ];
    d3_geom_voronoiDetachBeach(beach);
    var lArc = previous;
    while (lArc.circle && abs(x - lArc.circle.x) < ε && abs(y - lArc.circle.cy) < ε) {
      previous = lArc.P;
      disappearing.unshift(lArc);
      d3_geom_voronoiDetachBeach(lArc);
      lArc = previous;
    }
    disappearing.unshift(lArc);
    d3_geom_voronoiDetachCircle(lArc);
    var rArc = next;
    while (rArc.circle && abs(x - rArc.circle.x) < ε && abs(y - rArc.circle.cy) < ε) {
      next = rArc.N;
      disappearing.push(rArc);
      d3_geom_voronoiDetachBeach(rArc);
      rArc = next;
    }
    disappearing.push(rArc);
    d3_geom_voronoiDetachCircle(rArc);
    var nArcs = disappearing.length, iArc;
    for (iArc = 1; iArc < nArcs; ++iArc) {
      rArc = disappearing[iArc];
      lArc = disappearing[iArc - 1];
      d3_geom_voronoiSetEdgeEnd(rArc.edge, lArc.site, rArc.site, vertex);
    }
    lArc = disappearing[0];
    rArc = disappearing[nArcs - 1];
    rArc.edge = d3_geom_voronoiCreateEdge(lArc.site, rArc.site, null, vertex);
    d3_geom_voronoiAttachCircle(lArc);
    d3_geom_voronoiAttachCircle(rArc);
  }
  function d3_geom_voronoiAddBeach(site) {
    var x = site.x, directrix = site.y, lArc, rArc, dxl, dxr, node = d3_geom_voronoiBeaches._;
    while (node) {
      dxl = d3_geom_voronoiLeftBreakPoint(node, directrix) - x;
      if (dxl > ε) node = node.L; else {
        dxr = x - d3_geom_voronoiRightBreakPoint(node, directrix);
        if (dxr > ε) {
          if (!node.R) {
            lArc = node;
            break;
          }
          node = node.R;
        } else {
          if (dxl > -ε) {
            lArc = node.P;
            rArc = node;
          } else if (dxr > -ε) {
            lArc = node;
            rArc = node.N;
          } else {
            lArc = rArc = node;
          }
          break;
        }
      }
    }
    var newArc = d3_geom_voronoiCreateBeach(site);
    d3_geom_voronoiBeaches.insert(lArc, newArc);
    if (!lArc && !rArc) return;
    if (lArc === rArc) {
      d3_geom_voronoiDetachCircle(lArc);
      rArc = d3_geom_voronoiCreateBeach(lArc.site);
      d3_geom_voronoiBeaches.insert(newArc, rArc);
      newArc.edge = rArc.edge = d3_geom_voronoiCreateEdge(lArc.site, newArc.site);
      d3_geom_voronoiAttachCircle(lArc);
      d3_geom_voronoiAttachCircle(rArc);
      return;
    }
    if (!rArc) {
      newArc.edge = d3_geom_voronoiCreateEdge(lArc.site, newArc.site);
      return;
    }
    d3_geom_voronoiDetachCircle(lArc);
    d3_geom_voronoiDetachCircle(rArc);
    var lSite = lArc.site, ax = lSite.x, ay = lSite.y, bx = site.x - ax, by = site.y - ay, rSite = rArc.site, cx = rSite.x - ax, cy = rSite.y - ay, d = 2 * (bx * cy - by * cx), hb = bx * bx + by * by, hc = cx * cx + cy * cy, vertex = {
      x: (cy * hb - by * hc) / d + ax,
      y: (bx * hc - cx * hb) / d + ay
    };
    d3_geom_voronoiSetEdgeEnd(rArc.edge, lSite, rSite, vertex);
    newArc.edge = d3_geom_voronoiCreateEdge(lSite, site, null, vertex);
    rArc.edge = d3_geom_voronoiCreateEdge(site, rSite, null, vertex);
    d3_geom_voronoiAttachCircle(lArc);
    d3_geom_voronoiAttachCircle(rArc);
  }
  function d3_geom_voronoiLeftBreakPoint(arc, directrix) {
    var site = arc.site, rfocx = site.x, rfocy = site.y, pby2 = rfocy - directrix;
    if (!pby2) return rfocx;
    var lArc = arc.P;
    if (!lArc) return -Infinity;
    site = lArc.site;
    var lfocx = site.x, lfocy = site.y, plby2 = lfocy - directrix;
    if (!plby2) return lfocx;
    var hl = lfocx - rfocx, aby2 = 1 / pby2 - 1 / plby2, b = hl / plby2;
    if (aby2) return (-b + Math.sqrt(b * b - 2 * aby2 * (hl * hl / (-2 * plby2) - lfocy + plby2 / 2 + rfocy - pby2 / 2))) / aby2 + rfocx;
    return (rfocx + lfocx) / 2;
  }
  function d3_geom_voronoiRightBreakPoint(arc, directrix) {
    var rArc = arc.N;
    if (rArc) return d3_geom_voronoiLeftBreakPoint(rArc, directrix);
    var site = arc.site;
    return site.y === directrix ? site.x : Infinity;
  }
  function d3_geom_voronoiCell(site) {
    this.site = site;
    this.edges = [];
  }
  d3_geom_voronoiCell.prototype.prepare = function() {
    var halfEdges = this.edges, iHalfEdge = halfEdges.length, edge;
    while (iHalfEdge--) {
      edge = halfEdges[iHalfEdge].edge;
      if (!edge.b || !edge.a) halfEdges.splice(iHalfEdge, 1);
    }
    halfEdges.sort(d3_geom_voronoiHalfEdgeOrder);
    return halfEdges.length;
  };
  function d3_geom_voronoiCloseCells(extent) {
    var x0 = extent[0][0], x1 = extent[1][0], y0 = extent[0][1], y1 = extent[1][1], x2, y2, x3, y3, cells = d3_geom_voronoiCells, iCell = cells.length, cell, iHalfEdge, halfEdges, nHalfEdges, start, end;
    while (iCell--) {
      cell = cells[iCell];
      if (!cell || !cell.prepare()) continue;
      halfEdges = cell.edges;
      nHalfEdges = halfEdges.length;
      iHalfEdge = 0;
      while (iHalfEdge < nHalfEdges) {
        end = halfEdges[iHalfEdge].end(), x3 = end.x, y3 = end.y;
        start = halfEdges[++iHalfEdge % nHalfEdges].start(), x2 = start.x, y2 = start.y;
        if (abs(x3 - x2) > ε || abs(y3 - y2) > ε) {
          halfEdges.splice(iHalfEdge, 0, new d3_geom_voronoiHalfEdge(d3_geom_voronoiCreateBorderEdge(cell.site, end, abs(x3 - x0) < ε && y1 - y3 > ε ? {
            x: x0,
            y: abs(x2 - x0) < ε ? y2 : y1
          } : abs(y3 - y1) < ε && x1 - x3 > ε ? {
            x: abs(y2 - y1) < ε ? x2 : x1,
            y: y1
          } : abs(x3 - x1) < ε && y3 - y0 > ε ? {
            x: x1,
            y: abs(x2 - x1) < ε ? y2 : y0
          } : abs(y3 - y0) < ε && x3 - x0 > ε ? {
            x: abs(y2 - y0) < ε ? x2 : x0,
            y: y0
          } : null), cell.site, null));
          ++nHalfEdges;
        }
      }
    }
  }
  function d3_geom_voronoiHalfEdgeOrder(a, b) {
    return b.angle - a.angle;
  }
  function d3_geom_voronoiCircle() {
    d3_geom_voronoiRedBlackNode(this);
    this.x = this.y = this.arc = this.site = this.cy = null;
  }
  function d3_geom_voronoiAttachCircle(arc) {
    var lArc = arc.P, rArc = arc.N;
    if (!lArc || !rArc) return;
    var lSite = lArc.site, cSite = arc.site, rSite = rArc.site;
    if (lSite === rSite) return;
    var bx = cSite.x, by = cSite.y, ax = lSite.x - bx, ay = lSite.y - by, cx = rSite.x - bx, cy = rSite.y - by;
    var d = 2 * (ax * cy - ay * cx);
    if (d >= -ε2) return;
    var ha = ax * ax + ay * ay, hc = cx * cx + cy * cy, x = (cy * ha - ay * hc) / d, y = (ax * hc - cx * ha) / d, cy = y + by;
    var circle = d3_geom_voronoiCirclePool.pop() || new d3_geom_voronoiCircle();
    circle.arc = arc;
    circle.site = cSite;
    circle.x = x + bx;
    circle.y = cy + Math.sqrt(x * x + y * y);
    circle.cy = cy;
    arc.circle = circle;
    var before = null, node = d3_geom_voronoiCircles._;
    while (node) {
      if (circle.y < node.y || circle.y === node.y && circle.x <= node.x) {
        if (node.L) node = node.L; else {
          before = node.P;
          break;
        }
      } else {
        if (node.R) node = node.R; else {
          before = node;
          break;
        }
      }
    }
    d3_geom_voronoiCircles.insert(before, circle);
    if (!before) d3_geom_voronoiFirstCircle = circle;
  }
  function d3_geom_voronoiDetachCircle(arc) {
    var circle = arc.circle;
    if (circle) {
      if (!circle.P) d3_geom_voronoiFirstCircle = circle.N;
      d3_geom_voronoiCircles.remove(circle);
      d3_geom_voronoiCirclePool.push(circle);
      d3_geom_voronoiRedBlackNode(circle);
      arc.circle = null;
    }
  }
  function d3_geom_voronoiClipEdges(extent) {
    var edges = d3_geom_voronoiEdges, clip = d3_geom_clipLine(extent[0][0], extent[0][1], extent[1][0], extent[1][1]), i = edges.length, e;
    while (i--) {
      e = edges[i];
      if (!d3_geom_voronoiConnectEdge(e, extent) || !clip(e) || abs(e.a.x - e.b.x) < ε && abs(e.a.y - e.b.y) < ε) {
        e.a = e.b = null;
        edges.splice(i, 1);
      }
    }
  }
  function d3_geom_voronoiConnectEdge(edge, extent) {
    var vb = edge.b;
    if (vb) return true;
    var va = edge.a, x0 = extent[0][0], x1 = extent[1][0], y0 = extent[0][1], y1 = extent[1][1], lSite = edge.l, rSite = edge.r, lx = lSite.x, ly = lSite.y, rx = rSite.x, ry = rSite.y, fx = (lx + rx) / 2, fy = (ly + ry) / 2, fm, fb;
    if (ry === ly) {
      if (fx < x0 || fx >= x1) return;
      if (lx > rx) {
        if (!va) va = {
          x: fx,
          y: y0
        }; else if (va.y >= y1) return;
        vb = {
          x: fx,
          y: y1
        };
      } else {
        if (!va) va = {
          x: fx,
          y: y1
        }; else if (va.y < y0) return;
        vb = {
          x: fx,
          y: y0
        };
      }
    } else {
      fm = (lx - rx) / (ry - ly);
      fb = fy - fm * fx;
      if (fm < -1 || fm > 1) {
        if (lx > rx) {
          if (!va) va = {
            x: (y0 - fb) / fm,
            y: y0
          }; else if (va.y >= y1) return;
          vb = {
            x: (y1 - fb) / fm,
            y: y1
          };
        } else {
          if (!va) va = {
            x: (y1 - fb) / fm,
            y: y1
          }; else if (va.y < y0) return;
          vb = {
            x: (y0 - fb) / fm,
            y: y0
          };
        }
      } else {
        if (ly < ry) {
          if (!va) va = {
            x: x0,
            y: fm * x0 + fb
          }; else if (va.x >= x1) return;
          vb = {
            x: x1,
            y: fm * x1 + fb
          };
        } else {
          if (!va) va = {
            x: x1,
            y: fm * x1 + fb
          }; else if (va.x < x0) return;
          vb = {
            x: x0,
            y: fm * x0 + fb
          };
        }
      }
    }
    edge.a = va;
    edge.b = vb;
    return true;
  }
  function d3_geom_voronoiEdge(lSite, rSite) {
    this.l = lSite;
    this.r = rSite;
    this.a = this.b = null;
  }
  function d3_geom_voronoiCreateEdge(lSite, rSite, va, vb) {
    var edge = new d3_geom_voronoiEdge(lSite, rSite);
    d3_geom_voronoiEdges.push(edge);
    if (va) d3_geom_voronoiSetEdgeEnd(edge, lSite, rSite, va);
    if (vb) d3_geom_voronoiSetEdgeEnd(edge, rSite, lSite, vb);
    d3_geom_voronoiCells[lSite.i].edges.push(new d3_geom_voronoiHalfEdge(edge, lSite, rSite));
    d3_geom_voronoiCells[rSite.i].edges.push(new d3_geom_voronoiHalfEdge(edge, rSite, lSite));
    return edge;
  }
  function d3_geom_voronoiCreateBorderEdge(lSite, va, vb) {
    var edge = new d3_geom_voronoiEdge(lSite, null);
    edge.a = va;
    edge.b = vb;
    d3_geom_voronoiEdges.push(edge);
    return edge;
  }
  function d3_geom_voronoiSetEdgeEnd(edge, lSite, rSite, vertex) {
    if (!edge.a && !edge.b) {
      edge.a = vertex;
      edge.l = lSite;
      edge.r = rSite;
    } else if (edge.l === rSite) {
      edge.b = vertex;
    } else {
      edge.a = vertex;
    }
  }
  function d3_geom_voronoiHalfEdge(edge, lSite, rSite) {
    var va = edge.a, vb = edge.b;
    this.edge = edge;
    this.site = lSite;
    this.angle = rSite ? Math.atan2(rSite.y - lSite.y, rSite.x - lSite.x) : edge.l === lSite ? Math.atan2(vb.x - va.x, va.y - vb.y) : Math.atan2(va.x - vb.x, vb.y - va.y);
  }
  d3_geom_voronoiHalfEdge.prototype = {
    start: function() {
      return this.edge.l === this.site ? this.edge.a : this.edge.b;
    },
    end: function() {
      return this.edge.l === this.site ? this.edge.b : this.edge.a;
    }
  };
  function d3_geom_voronoiRedBlackTree() {
    this._ = null;
  }
  function d3_geom_voronoiRedBlackNode(node) {
    node.U = node.C = node.L = node.R = node.P = node.N = null;
  }
  d3_geom_voronoiRedBlackTree.prototype = {
    insert: function(after, node) {
      var parent, grandpa, uncle;
      if (after) {
        node.P = after;
        node.N = after.N;
        if (after.N) after.N.P = node;
        after.N = node;
        if (after.R) {
          after = after.R;
          while (after.L) after = after.L;
          after.L = node;
        } else {
          after.R = node;
        }
        parent = after;
      } else if (this._) {
        after = d3_geom_voronoiRedBlackFirst(this._);
        node.P = null;
        node.N = after;
        after.P = after.L = node;
        parent = after;
      } else {
        node.P = node.N = null;
        this._ = node;
        parent = null;
      }
      node.L = node.R = null;
      node.U = parent;
      node.C = true;
      after = node;
      while (parent && parent.C) {
        grandpa = parent.U;
        if (parent === grandpa.L) {
          uncle = grandpa.R;
          if (uncle && uncle.C) {
            parent.C = uncle.C = false;
            grandpa.C = true;
            after = grandpa;
          } else {
            if (after === parent.R) {
              d3_geom_voronoiRedBlackRotateLeft(this, parent);
              after = parent;
              parent = after.U;
            }
            parent.C = false;
            grandpa.C = true;
            d3_geom_voronoiRedBlackRotateRight(this, grandpa);
          }
        } else {
          uncle = grandpa.L;
          if (uncle && uncle.C) {
            parent.C = uncle.C = false;
            grandpa.C = true;
            after = grandpa;
          } else {
            if (after === parent.L) {
              d3_geom_voronoiRedBlackRotateRight(this, parent);
              after = parent;
              parent = after.U;
            }
            parent.C = false;
            grandpa.C = true;
            d3_geom_voronoiRedBlackRotateLeft(this, grandpa);
          }
        }
        parent = after.U;
      }
      this._.C = false;
    },
    remove: function(node) {
      if (node.N) node.N.P = node.P;
      if (node.P) node.P.N = node.N;
      node.N = node.P = null;
      var parent = node.U, sibling, left = node.L, right = node.R, next, red;
      if (!left) next = right; else if (!right) next = left; else next = d3_geom_voronoiRedBlackFirst(right);
      if (parent) {
        if (parent.L === node) parent.L = next; else parent.R = next;
      } else {
        this._ = next;
      }
      if (left && right) {
        red = next.C;
        next.C = node.C;
        next.L = left;
        left.U = next;
        if (next !== right) {
          parent = next.U;
          next.U = node.U;
          node = next.R;
          parent.L = node;
          next.R = right;
          right.U = next;
        } else {
          next.U = parent;
          parent = next;
          node = next.R;
        }
      } else {
        red = node.C;
        node = next;
      }
      if (node) node.U = parent;
      if (red) return;
      if (node && node.C) {
        node.C = false;
        return;
      }
      do {
        if (node === this._) break;
        if (node === parent.L) {
          sibling = parent.R;
          if (sibling.C) {
            sibling.C = false;
            parent.C = true;
            d3_geom_voronoiRedBlackRotateLeft(this, parent);
            sibling = parent.R;
          }
          if (sibling.L && sibling.L.C || sibling.R && sibling.R.C) {
            if (!sibling.R || !sibling.R.C) {
              sibling.L.C = false;
              sibling.C = true;
              d3_geom_voronoiRedBlackRotateRight(this, sibling);
              sibling = parent.R;
            }
            sibling.C = parent.C;
            parent.C = sibling.R.C = false;
            d3_geom_voronoiRedBlackRotateLeft(this, parent);
            node = this._;
            break;
          }
        } else {
          sibling = parent.L;
          if (sibling.C) {
            sibling.C = false;
            parent.C = true;
            d3_geom_voronoiRedBlackRotateRight(this, parent);
            sibling = parent.L;
          }
          if (sibling.L && sibling.L.C || sibling.R && sibling.R.C) {
            if (!sibling.L || !sibling.L.C) {
              sibling.R.C = false;
              sibling.C = true;
              d3_geom_voronoiRedBlackRotateLeft(this, sibling);
              sibling = parent.L;
            }
            sibling.C = parent.C;
            parent.C = sibling.L.C = false;
            d3_geom_voronoiRedBlackRotateRight(this, parent);
            node = this._;
            break;
          }
        }
        sibling.C = true;
        node = parent;
        parent = parent.U;
      } while (!node.C);
      if (node) node.C = false;
    }
  };
  function d3_geom_voronoiRedBlackRotateLeft(tree, node) {
    var p = node, q = node.R, parent = p.U;
    if (parent) {
      if (parent.L === p) parent.L = q; else parent.R = q;
    } else {
      tree._ = q;
    }
    q.U = parent;
    p.U = q;
    p.R = q.L;
    if (p.R) p.R.U = p;
    q.L = p;
  }
  function d3_geom_voronoiRedBlackRotateRight(tree, node) {
    var p = node, q = node.L, parent = p.U;
    if (parent) {
      if (parent.L === p) parent.L = q; else parent.R = q;
    } else {
      tree._ = q;
    }
    q.U = parent;
    p.U = q;
    p.L = q.R;
    if (p.L) p.L.U = p;
    q.R = p;
  }
  function d3_geom_voronoiRedBlackFirst(node) {
    while (node.L) node = node.L;
    return node;
  }
  function d3_geom_voronoi(sites, bbox) {
    var site = sites.sort(d3_geom_voronoiVertexOrder).pop(), x0, y0, circle;
    d3_geom_voronoiEdges = [];
    d3_geom_voronoiCells = new Array(sites.length);
    d3_geom_voronoiBeaches = new d3_geom_voronoiRedBlackTree();
    d3_geom_voronoiCircles = new d3_geom_voronoiRedBlackTree();
    while (true) {
      circle = d3_geom_voronoiFirstCircle;
      if (site && (!circle || site.y < circle.y || site.y === circle.y && site.x < circle.x)) {
        if (site.x !== x0 || site.y !== y0) {
          d3_geom_voronoiCells[site.i] = new d3_geom_voronoiCell(site);
          d3_geom_voronoiAddBeach(site);
          x0 = site.x, y0 = site.y;
        }
        site = sites.pop();
      } else if (circle) {
        d3_geom_voronoiRemoveBeach(circle.arc);
      } else {
        break;
      }
    }
    if (bbox) d3_geom_voronoiClipEdges(bbox), d3_geom_voronoiCloseCells(bbox);
    var diagram = {
      cells: d3_geom_voronoiCells,
      edges: d3_geom_voronoiEdges
    };
    d3_geom_voronoiBeaches = d3_geom_voronoiCircles = d3_geom_voronoiEdges = d3_geom_voronoiCells = null;
    return diagram;
  }
  function d3_geom_voronoiVertexOrder(a, b) {
    return b.y - a.y || b.x - a.x;
  }
  d3.geom.voronoi = function(points) {
    var x = d3_geom_pointX, y = d3_geom_pointY, fx = x, fy = y, clipExtent = d3_geom_voronoiClipExtent;
    if (points) return voronoi(points);
    function voronoi(data) {
      var polygons = new Array(data.length), x0 = clipExtent[0][0], y0 = clipExtent[0][1], x1 = clipExtent[1][0], y1 = clipExtent[1][1];
      d3_geom_voronoi(sites(data), clipExtent).cells.forEach(function(cell, i) {
        var edges = cell.edges, site = cell.site, polygon = polygons[i] = edges.length ? edges.map(function(e) {
          var s = e.start();
          return [ s.x, s.y ];
        }) : site.x >= x0 && site.x <= x1 && site.y >= y0 && site.y <= y1 ? [ [ x0, y1 ], [ x1, y1 ], [ x1, y0 ], [ x0, y0 ] ] : [];
        polygon.point = data[i];
      });
      return polygons;
    }
    function sites(data) {
      return data.map(function(d, i) {
        return {
          x: Math.round(fx(d, i) / ε) * ε,
          y: Math.round(fy(d, i) / ε) * ε,
          i: i
        };
      });
    }
    voronoi.links = function(data) {
      return d3_geom_voronoi(sites(data)).edges.filter(function(edge) {
        return edge.l && edge.r;
      }).map(function(edge) {
        return {
          source: data[edge.l.i],
          target: data[edge.r.i]
        };
      });
    };
    voronoi.triangles = function(data) {
      var triangles = [];
      d3_geom_voronoi(sites(data)).cells.forEach(function(cell, i) {
        var site = cell.site, edges = cell.edges.sort(d3_geom_voronoiHalfEdgeOrder), j = -1, m = edges.length, e0, s0, e1 = edges[m - 1].edge, s1 = e1.l === site ? e1.r : e1.l;
        while (++j < m) {
          e0 = e1;
          s0 = s1;
          e1 = edges[j].edge;
          s1 = e1.l === site ? e1.r : e1.l;
          if (i < s0.i && i < s1.i && d3_geom_voronoiTriangleArea(site, s0, s1) < 0) {
            triangles.push([ data[i], data[s0.i], data[s1.i] ]);
          }
        }
      });
      return triangles;
    };
    voronoi.x = function(_) {
      return arguments.length ? (fx = d3_functor(x = _), voronoi) : x;
    };
    voronoi.y = function(_) {
      return arguments.length ? (fy = d3_functor(y = _), voronoi) : y;
    };
    voronoi.clipExtent = function(_) {
      if (!arguments.length) return clipExtent === d3_geom_voronoiClipExtent ? null : clipExtent;
      clipExtent = _ == null ? d3_geom_voronoiClipExtent : _;
      return voronoi;
    };
    voronoi.size = function(_) {
      if (!arguments.length) return clipExtent === d3_geom_voronoiClipExtent ? null : clipExtent && clipExtent[1];
      return voronoi.clipExtent(_ && [ [ 0, 0 ], _ ]);
    };
    return voronoi;
  };
  var d3_geom_voronoiClipExtent = [ [ -1e6, -1e6 ], [ 1e6, 1e6 ] ];
  function d3_geom_voronoiTriangleArea(a, b, c) {
    return (a.x - c.x) * (b.y - a.y) - (a.x - b.x) * (c.y - a.y);
  }
  d3.geom.delaunay = function(vertices) {
    return d3.geom.voronoi().triangles(vertices);
  };
  d3.geom.quadtree = function(points, x1, y1, x2, y2) {
    var x = d3_geom_pointX, y = d3_geom_pointY, compat;
    if (compat = arguments.length) {
      x = d3_geom_quadtreeCompatX;
      y = d3_geom_quadtreeCompatY;
      if (compat === 3) {
        y2 = y1;
        x2 = x1;
        y1 = x1 = 0;
      }
      return quadtree(points);
    }
    function quadtree(data) {
      var d, fx = d3_functor(x), fy = d3_functor(y), xs, ys, i, n, x1_, y1_, x2_, y2_;
      if (x1 != null) {
        x1_ = x1, y1_ = y1, x2_ = x2, y2_ = y2;
      } else {
        x2_ = y2_ = -(x1_ = y1_ = Infinity);
        xs = [], ys = [];
        n = data.length;
        if (compat) for (i = 0; i < n; ++i) {
          d = data[i];
          if (d.x < x1_) x1_ = d.x;
          if (d.y < y1_) y1_ = d.y;
          if (d.x > x2_) x2_ = d.x;
          if (d.y > y2_) y2_ = d.y;
          xs.push(d.x);
          ys.push(d.y);
        } else for (i = 0; i < n; ++i) {
          var x_ = +fx(d = data[i], i), y_ = +fy(d, i);
          if (x_ < x1_) x1_ = x_;
          if (y_ < y1_) y1_ = y_;
          if (x_ > x2_) x2_ = x_;
          if (y_ > y2_) y2_ = y_;
          xs.push(x_);
          ys.push(y_);
        }
      }
      var dx = x2_ - x1_, dy = y2_ - y1_;
      if (dx > dy) y2_ = y1_ + dx; else x2_ = x1_ + dy;
      function insert(n, d, x, y, x1, y1, x2, y2) {
        if (isNaN(x) || isNaN(y)) return;
        if (n.leaf) {
          var nx = n.x, ny = n.y;
          if (nx != null) {
            if (abs(nx - x) + abs(ny - y) < .01) {
              insertChild(n, d, x, y, x1, y1, x2, y2);
            } else {
              var nPoint = n.point;
              n.x = n.y = n.point = null;
              insertChild(n, nPoint, nx, ny, x1, y1, x2, y2);
              insertChild(n, d, x, y, x1, y1, x2, y2);
            }
          } else {
            n.x = x, n.y = y, n.point = d;
          }
        } else {
          insertChild(n, d, x, y, x1, y1, x2, y2);
        }
      }
      function insertChild(n, d, x, y, x1, y1, x2, y2) {
        var xm = (x1 + x2) * .5, ym = (y1 + y2) * .5, right = x >= xm, below = y >= ym, i = below << 1 | right;
        n.leaf = false;
        n = n.nodes[i] || (n.nodes[i] = d3_geom_quadtreeNode());
        if (right) x1 = xm; else x2 = xm;
        if (below) y1 = ym; else y2 = ym;
        insert(n, d, x, y, x1, y1, x2, y2);
      }
      var root = d3_geom_quadtreeNode();
      root.add = function(d) {
        insert(root, d, +fx(d, ++i), +fy(d, i), x1_, y1_, x2_, y2_);
      };
      root.visit = function(f) {
        d3_geom_quadtreeVisit(f, root, x1_, y1_, x2_, y2_);
      };
      root.find = function(point) {
        return d3_geom_quadtreeFind(root, point[0], point[1], x1_, y1_, x2_, y2_);
      };
      i = -1;
      if (x1 == null) {
        while (++i < n) {
          insert(root, data[i], xs[i], ys[i], x1_, y1_, x2_, y2_);
        }
        --i;
      } else data.forEach(root.add);
      xs = ys = data = d = null;
      return root;
    }
    quadtree.x = function(_) {
      return arguments.length ? (x = _, quadtree) : x;
    };
    quadtree.y = function(_) {
      return arguments.length ? (y = _, quadtree) : y;
    };
    quadtree.extent = function(_) {
      if (!arguments.length) return x1 == null ? null : [ [ x1, y1 ], [ x2, y2 ] ];
      if (_ == null) x1 = y1 = x2 = y2 = null; else x1 = +_[0][0], y1 = +_[0][1], x2 = +_[1][0], 
      y2 = +_[1][1];
      return quadtree;
    };
    quadtree.size = function(_) {
      if (!arguments.length) return x1 == null ? null : [ x2 - x1, y2 - y1 ];
      if (_ == null) x1 = y1 = x2 = y2 = null; else x1 = y1 = 0, x2 = +_[0], y2 = +_[1];
      return quadtree;
    };
    return quadtree;
  };
  function d3_geom_quadtreeCompatX(d) {
    return d.x;
  }
  function d3_geom_quadtreeCompatY(d) {
    return d.y;
  }
  function d3_geom_quadtreeNode() {
    return {
      leaf: true,
      nodes: [],
      point: null,
      x: null,
      y: null
    };
  }
  function d3_geom_quadtreeVisit(f, node, x1, y1, x2, y2) {
    if (!f(node, x1, y1, x2, y2)) {
      var sx = (x1 + x2) * .5, sy = (y1 + y2) * .5, children = node.nodes;
      if (children[0]) d3_geom_quadtreeVisit(f, children[0], x1, y1, sx, sy);
      if (children[1]) d3_geom_quadtreeVisit(f, children[1], sx, y1, x2, sy);
      if (children[2]) d3_geom_quadtreeVisit(f, children[2], x1, sy, sx, y2);
      if (children[3]) d3_geom_quadtreeVisit(f, children[3], sx, sy, x2, y2);
    }
  }
  function d3_geom_quadtreeFind(root, x, y, x0, y0, x3, y3) {
    var minDistance2 = Infinity, closestPoint;
    (function find(node, x1, y1, x2, y2) {
      if (x1 > x3 || y1 > y3 || x2 < x0 || y2 < y0) return;
      if (point = node.point) {
        var point, dx = x - node.x, dy = y - node.y, distance2 = dx * dx + dy * dy;
        if (distance2 < minDistance2) {
          var distance = Math.sqrt(minDistance2 = distance2);
          x0 = x - distance, y0 = y - distance;
          x3 = x + distance, y3 = y + distance;
          closestPoint = point;
        }
      }
      var children = node.nodes, xm = (x1 + x2) * .5, ym = (y1 + y2) * .5, right = x >= xm, below = y >= ym;
      for (var i = below << 1 | right, j = i + 4; i < j; ++i) {
        if (node = children[i & 3]) switch (i & 3) {
         case 0:
          find(node, x1, y1, xm, ym);
          break;

         case 1:
          find(node, xm, y1, x2, ym);
          break;

         case 2:
          find(node, x1, ym, xm, y2);
          break;

         case 3:
          find(node, xm, ym, x2, y2);
          break;
        }
      }
    })(root, x0, y0, x3, y3);
    return closestPoint;
  }
  d3.interpolateRgb = d3_interpolateRgb;
  function d3_interpolateRgb(a, b) {
    a = d3.rgb(a);
    b = d3.rgb(b);
    var ar = a.r, ag = a.g, ab = a.b, br = b.r - ar, bg = b.g - ag, bb = b.b - ab;
    return function(t) {
      return "#" + d3_rgb_hex(Math.round(ar + br * t)) + d3_rgb_hex(Math.round(ag + bg * t)) + d3_rgb_hex(Math.round(ab + bb * t));
    };
  }
  d3.interpolateObject = d3_interpolateObject;
  function d3_interpolateObject(a, b) {
    var i = {}, c = {}, k;
    for (k in a) {
      if (k in b) {
        i[k] = d3_interpolate(a[k], b[k]);
      } else {
        c[k] = a[k];
      }
    }
    for (k in b) {
      if (!(k in a)) {
        c[k] = b[k];
      }
    }
    return function(t) {
      for (k in i) c[k] = i[k](t);
      return c;
    };
  }
  d3.interpolateNumber = d3_interpolateNumber;
  function d3_interpolateNumber(a, b) {
    a = +a, b = +b;
    return function(t) {
      return a * (1 - t) + b * t;
    };
  }
  d3.interpolateString = d3_interpolateString;
  function d3_interpolateString(a, b) {
    var bi = d3_interpolate_numberA.lastIndex = d3_interpolate_numberB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
    a = a + "", b = b + "";
    while ((am = d3_interpolate_numberA.exec(a)) && (bm = d3_interpolate_numberB.exec(b))) {
      if ((bs = bm.index) > bi) {
        bs = b.slice(bi, bs);
        if (s[i]) s[i] += bs; else s[++i] = bs;
      }
      if ((am = am[0]) === (bm = bm[0])) {
        if (s[i]) s[i] += bm; else s[++i] = bm;
      } else {
        s[++i] = null;
        q.push({
          i: i,
          x: d3_interpolateNumber(am, bm)
        });
      }
      bi = d3_interpolate_numberB.lastIndex;
    }
    if (bi < b.length) {
      bs = b.slice(bi);
      if (s[i]) s[i] += bs; else s[++i] = bs;
    }
    return s.length < 2 ? q[0] ? (b = q[0].x, function(t) {
      return b(t) + "";
    }) : function() {
      return b;
    } : (b = q.length, function(t) {
      for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    });
  }
  var d3_interpolate_numberA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, d3_interpolate_numberB = new RegExp(d3_interpolate_numberA.source, "g");
  d3.interpolate = d3_interpolate;
  function d3_interpolate(a, b) {
    var i = d3.interpolators.length, f;
    while (--i >= 0 && !(f = d3.interpolators[i](a, b))) ;
    return f;
  }
  d3.interpolators = [ function(a, b) {
    var t = typeof b;
    return (t === "string" ? d3_rgb_names.has(b.toLowerCase()) || /^(#|rgb\(|hsl\()/i.test(b) ? d3_interpolateRgb : d3_interpolateString : b instanceof d3_color ? d3_interpolateRgb : Array.isArray(b) ? d3_interpolateArray : t === "object" && isNaN(b) ? d3_interpolateObject : d3_interpolateNumber)(a, b);
  } ];
  d3.interpolateArray = d3_interpolateArray;
  function d3_interpolateArray(a, b) {
    var x = [], c = [], na = a.length, nb = b.length, n0 = Math.min(a.length, b.length), i;
    for (i = 0; i < n0; ++i) x.push(d3_interpolate(a[i], b[i]));
    for (;i < na; ++i) c[i] = a[i];
    for (;i < nb; ++i) c[i] = b[i];
    return function(t) {
      for (i = 0; i < n0; ++i) c[i] = x[i](t);
      return c;
    };
  }
  var d3_ease_default = function() {
    return d3_identity;
  };
  var d3_ease = d3.map({
    linear: d3_ease_default,
    poly: d3_ease_poly,
    quad: function() {
      return d3_ease_quad;
    },
    cubic: function() {
      return d3_ease_cubic;
    },
    sin: function() {
      return d3_ease_sin;
    },
    exp: function() {
      return d3_ease_exp;
    },
    circle: function() {
      return d3_ease_circle;
    },
    elastic: d3_ease_elastic,
    back: d3_ease_back,
    bounce: function() {
      return d3_ease_bounce;
    }
  });
  var d3_ease_mode = d3.map({
    "in": d3_identity,
    out: d3_ease_reverse,
    "in-out": d3_ease_reflect,
    "out-in": function(f) {
      return d3_ease_reflect(d3_ease_reverse(f));
    }
  });
  d3.ease = function(name) {
    var i = name.indexOf("-"), t = i >= 0 ? name.slice(0, i) : name, m = i >= 0 ? name.slice(i + 1) : "in";
    t = d3_ease.get(t) || d3_ease_default;
    m = d3_ease_mode.get(m) || d3_identity;
    return d3_ease_clamp(m(t.apply(null, d3_arraySlice.call(arguments, 1))));
  };
  function d3_ease_clamp(f) {
    return function(t) {
      return t <= 0 ? 0 : t >= 1 ? 1 : f(t);
    };
  }
  function d3_ease_reverse(f) {
    return function(t) {
      return 1 - f(1 - t);
    };
  }
  function d3_ease_reflect(f) {
    return function(t) {
      return .5 * (t < .5 ? f(2 * t) : 2 - f(2 - 2 * t));
    };
  }
  function d3_ease_quad(t) {
    return t * t;
  }
  function d3_ease_cubic(t) {
    return t * t * t;
  }
  function d3_ease_cubicInOut(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    var t2 = t * t, t3 = t2 * t;
    return 4 * (t < .5 ? t3 : 3 * (t - t2) + t3 - .75);
  }
  function d3_ease_poly(e) {
    return function(t) {
      return Math.pow(t, e);
    };
  }
  function d3_ease_sin(t) {
    return 1 - Math.cos(t * halfπ);
  }
  function d3_ease_exp(t) {
    return Math.pow(2, 10 * (t - 1));
  }
  function d3_ease_circle(t) {
    return 1 - Math.sqrt(1 - t * t);
  }
  function d3_ease_elastic(a, p) {
    var s;
    if (arguments.length < 2) p = .45;
    if (arguments.length) s = p / τ * Math.asin(1 / a); else a = 1, s = p / 4;
    return function(t) {
      return 1 + a * Math.pow(2, -10 * t) * Math.sin((t - s) * τ / p);
    };
  }
  function d3_ease_back(s) {
    if (!s) s = 1.70158;
    return function(t) {
      return t * t * ((s + 1) * t - s);
    };
  }
  function d3_ease_bounce(t) {
    return t < 1 / 2.75 ? 7.5625 * t * t : t < 2 / 2.75 ? 7.5625 * (t -= 1.5 / 2.75) * t + .75 : t < 2.5 / 2.75 ? 7.5625 * (t -= 2.25 / 2.75) * t + .9375 : 7.5625 * (t -= 2.625 / 2.75) * t + .984375;
  }
  d3.interpolateHcl = d3_interpolateHcl;
  function d3_interpolateHcl(a, b) {
    a = d3.hcl(a);
    b = d3.hcl(b);
    var ah = a.h, ac = a.c, al = a.l, bh = b.h - ah, bc = b.c - ac, bl = b.l - al;
    if (isNaN(bc)) bc = 0, ac = isNaN(ac) ? b.c : ac;
    if (isNaN(bh)) bh = 0, ah = isNaN(ah) ? b.h : ah; else if (bh > 180) bh -= 360; else if (bh < -180) bh += 360;
    return function(t) {
      return d3_hcl_lab(ah + bh * t, ac + bc * t, al + bl * t) + "";
    };
  }
  d3.interpolateHsl = d3_interpolateHsl;
  function d3_interpolateHsl(a, b) {
    a = d3.hsl(a);
    b = d3.hsl(b);
    var ah = a.h, as = a.s, al = a.l, bh = b.h - ah, bs = b.s - as, bl = b.l - al;
    if (isNaN(bs)) bs = 0, as = isNaN(as) ? b.s : as;
    if (isNaN(bh)) bh = 0, ah = isNaN(ah) ? b.h : ah; else if (bh > 180) bh -= 360; else if (bh < -180) bh += 360;
    return function(t) {
      return d3_hsl_rgb(ah + bh * t, as + bs * t, al + bl * t) + "";
    };
  }
  d3.interpolateLab = d3_interpolateLab;
  function d3_interpolateLab(a, b) {
    a = d3.lab(a);
    b = d3.lab(b);
    var al = a.l, aa = a.a, ab = a.b, bl = b.l - al, ba = b.a - aa, bb = b.b - ab;
    return function(t) {
      return d3_lab_rgb(al + bl * t, aa + ba * t, ab + bb * t) + "";
    };
  }
  d3.interpolateRound = d3_interpolateRound;
  function d3_interpolateRound(a, b) {
    b -= a;
    return function(t) {
      return Math.round(a + b * t);
    };
  }
  d3.transform = function(string) {
    var g = d3_document.createElementNS(d3.ns.prefix.svg, "g");
    return (d3.transform = function(string) {
      if (string != null) {
        g.setAttribute("transform", string);
        var t = g.transform.baseVal.consolidate();
      }
      return new d3_transform(t ? t.matrix : d3_transformIdentity);
    })(string);
  };
  function d3_transform(m) {
    var r0 = [ m.a, m.b ], r1 = [ m.c, m.d ], kx = d3_transformNormalize(r0), kz = d3_transformDot(r0, r1), ky = d3_transformNormalize(d3_transformCombine(r1, r0, -kz)) || 0;
    if (r0[0] * r1[1] < r1[0] * r0[1]) {
      r0[0] *= -1;
      r0[1] *= -1;
      kx *= -1;
      kz *= -1;
    }
    this.rotate = (kx ? Math.atan2(r0[1], r0[0]) : Math.atan2(-r1[0], r1[1])) * d3_degrees;
    this.translate = [ m.e, m.f ];
    this.scale = [ kx, ky ];
    this.skew = ky ? Math.atan2(kz, ky) * d3_degrees : 0;
  }
  d3_transform.prototype.toString = function() {
    return "translate(" + this.translate + ")rotate(" + this.rotate + ")skewX(" + this.skew + ")scale(" + this.scale + ")";
  };
  function d3_transformDot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
  }
  function d3_transformNormalize(a) {
    var k = Math.sqrt(d3_transformDot(a, a));
    if (k) {
      a[0] /= k;
      a[1] /= k;
    }
    return k;
  }
  function d3_transformCombine(a, b, k) {
    a[0] += k * b[0];
    a[1] += k * b[1];
    return a;
  }
  var d3_transformIdentity = {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: 0,
    f: 0
  };
  d3.interpolateTransform = d3_interpolateTransform;
  function d3_interpolateTransformPop(s) {
    return s.length ? s.pop() + "," : "";
  }
  function d3_interpolateTranslate(ta, tb, s, q) {
    if (ta[0] !== tb[0] || ta[1] !== tb[1]) {
      var i = s.push("translate(", null, ",", null, ")");
      q.push({
        i: i - 4,
        x: d3_interpolateNumber(ta[0], tb[0])
      }, {
        i: i - 2,
        x: d3_interpolateNumber(ta[1], tb[1])
      });
    } else if (tb[0] || tb[1]) {
      s.push("translate(" + tb + ")");
    }
  }
  function d3_interpolateRotate(ra, rb, s, q) {
    if (ra !== rb) {
      if (ra - rb > 180) rb += 360; else if (rb - ra > 180) ra += 360;
      q.push({
        i: s.push(d3_interpolateTransformPop(s) + "rotate(", null, ")") - 2,
        x: d3_interpolateNumber(ra, rb)
      });
    } else if (rb) {
      s.push(d3_interpolateTransformPop(s) + "rotate(" + rb + ")");
    }
  }
  function d3_interpolateSkew(wa, wb, s, q) {
    if (wa !== wb) {
      q.push({
        i: s.push(d3_interpolateTransformPop(s) + "skewX(", null, ")") - 2,
        x: d3_interpolateNumber(wa, wb)
      });
    } else if (wb) {
      s.push(d3_interpolateTransformPop(s) + "skewX(" + wb + ")");
    }
  }
  function d3_interpolateScale(ka, kb, s, q) {
    if (ka[0] !== kb[0] || ka[1] !== kb[1]) {
      var i = s.push(d3_interpolateTransformPop(s) + "scale(", null, ",", null, ")");
      q.push({
        i: i - 4,
        x: d3_interpolateNumber(ka[0], kb[0])
      }, {
        i: i - 2,
        x: d3_interpolateNumber(ka[1], kb[1])
      });
    } else if (kb[0] !== 1 || kb[1] !== 1) {
      s.push(d3_interpolateTransformPop(s) + "scale(" + kb + ")");
    }
  }
  function d3_interpolateTransform(a, b) {
    var s = [], q = [];
    a = d3.transform(a), b = d3.transform(b);
    d3_interpolateTranslate(a.translate, b.translate, s, q);
    d3_interpolateRotate(a.rotate, b.rotate, s, q);
    d3_interpolateSkew(a.skew, b.skew, s, q);
    d3_interpolateScale(a.scale, b.scale, s, q);
    a = b = null;
    return function(t) {
      var i = -1, n = q.length, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  }
  function d3_uninterpolateNumber(a, b) {
    b = (b -= a = +a) || 1 / b;
    return function(x) {
      return (x - a) / b;
    };
  }
  function d3_uninterpolateClamp(a, b) {
    b = (b -= a = +a) || 1 / b;
    return function(x) {
      return Math.max(0, Math.min(1, (x - a) / b));
    };
  }
  d3.layout = {};
  d3.layout.bundle = function() {
    return function(links) {
      var paths = [], i = -1, n = links.length;
      while (++i < n) paths.push(d3_layout_bundlePath(links[i]));
      return paths;
    };
  };
  function d3_layout_bundlePath(link) {
    var start = link.source, end = link.target, lca = d3_layout_bundleLeastCommonAncestor(start, end), points = [ start ];
    while (start !== lca) {
      start = start.parent;
      points.push(start);
    }
    var k = points.length;
    while (end !== lca) {
      points.splice(k, 0, end);
      end = end.parent;
    }
    return points;
  }
  function d3_layout_bundleAncestors(node) {
    var ancestors = [], parent = node.parent;
    while (parent != null) {
      ancestors.push(node);
      node = parent;
      parent = parent.parent;
    }
    ancestors.push(node);
    return ancestors;
  }
  function d3_layout_bundleLeastCommonAncestor(a, b) {
    if (a === b) return a;
    var aNodes = d3_layout_bundleAncestors(a), bNodes = d3_layout_bundleAncestors(b), aNode = aNodes.pop(), bNode = bNodes.pop(), sharedNode = null;
    while (aNode === bNode) {
      sharedNode = aNode;
      aNode = aNodes.pop();
      bNode = bNodes.pop();
    }
    return sharedNode;
  }
  d3.layout.chord = function() {
    var chord = {}, chords, groups, matrix, n, padding = 0, sortGroups, sortSubgroups, sortChords;
    function relayout() {
      var subgroups = {}, groupSums = [], groupIndex = d3.range(n), subgroupIndex = [], k, x, x0, i, j;
      chords = [];
      groups = [];
      k = 0, i = -1;
      while (++i < n) {
        x = 0, j = -1;
        while (++j < n) {
          x += matrix[i][j];
        }
        groupSums.push(x);
        subgroupIndex.push(d3.range(n));
        k += x;
      }
      if (sortGroups) {
        groupIndex.sort(function(a, b) {
          return sortGroups(groupSums[a], groupSums[b]);
        });
      }
      if (sortSubgroups) {
        subgroupIndex.forEach(function(d, i) {
          d.sort(function(a, b) {
            return sortSubgroups(matrix[i][a], matrix[i][b]);
          });
        });
      }
      k = (τ - padding * n) / k;
      x = 0, i = -1;
      while (++i < n) {
        x0 = x, j = -1;
        while (++j < n) {
          var di = groupIndex[i], dj = subgroupIndex[di][j], v = matrix[di][dj], a0 = x, a1 = x += v * k;
          subgroups[di + "-" + dj] = {
            index: di,
            subindex: dj,
            startAngle: a0,
            endAngle: a1,
            value: v
          };
        }
        groups[di] = {
          index: di,
          startAngle: x0,
          endAngle: x,
          value: groupSums[di]
        };
        x += padding;
      }
      i = -1;
      while (++i < n) {
        j = i - 1;
        while (++j < n) {
          var source = subgroups[i + "-" + j], target = subgroups[j + "-" + i];
          if (source.value || target.value) {
            chords.push(source.value < target.value ? {
              source: target,
              target: source
            } : {
              source: source,
              target: target
            });
          }
        }
      }
      if (sortChords) resort();
    }
    function resort() {
      chords.sort(function(a, b) {
        return sortChords((a.source.value + a.target.value) / 2, (b.source.value + b.target.value) / 2);
      });
    }
    chord.matrix = function(x) {
      if (!arguments.length) return matrix;
      n = (matrix = x) && matrix.length;
      chords = groups = null;
      return chord;
    };
    chord.padding = function(x) {
      if (!arguments.length) return padding;
      padding = x;
      chords = groups = null;
      return chord;
    };
    chord.sortGroups = function(x) {
      if (!arguments.length) return sortGroups;
      sortGroups = x;
      chords = groups = null;
      return chord;
    };
    chord.sortSubgroups = function(x) {
      if (!arguments.length) return sortSubgroups;
      sortSubgroups = x;
      chords = null;
      return chord;
    };
    chord.sortChords = function(x) {
      if (!arguments.length) return sortChords;
      sortChords = x;
      if (chords) resort();
      return chord;
    };
    chord.chords = function() {
      if (!chords) relayout();
      return chords;
    };
    chord.groups = function() {
      if (!groups) relayout();
      return groups;
    };
    return chord;
  };
  d3.layout.force = function() {
    var force = {}, event = d3.dispatch("start", "tick", "end"), timer, size = [ 1, 1 ], drag, alpha, friction = .9, linkDistance = d3_layout_forceLinkDistance, linkStrength = d3_layout_forceLinkStrength, charge = -30, chargeDistance2 = d3_layout_forceChargeDistance2, gravity = .1, theta2 = .64, nodes = [], links = [], distances, strengths, charges;
    function repulse(node) {
      return function(quad, x1, _, x2) {
        if (quad.point !== node) {
          var dx = quad.cx - node.x, dy = quad.cy - node.y, dw = x2 - x1, dn = dx * dx + dy * dy;
          if (dw * dw / theta2 < dn) {
            if (dn < chargeDistance2) {
              var k = quad.charge / dn;
              node.px -= dx * k;
              node.py -= dy * k;
            }
            return true;
          }
          if (quad.point && dn && dn < chargeDistance2) {
            var k = quad.pointCharge / dn;
            node.px -= dx * k;
            node.py -= dy * k;
          }
        }
        return !quad.charge;
      };
    }
    force.tick = function() {
      if ((alpha *= .99) < .005) {
        timer = null;
        event.end({
          type: "end",
          alpha: alpha = 0
        });
        return true;
      }
      var n = nodes.length, m = links.length, q, i, o, s, t, l, k, x, y;
      for (i = 0; i < m; ++i) {
        o = links[i];
        s = o.source;
        t = o.target;
        x = t.x - s.x;
        y = t.y - s.y;
        if (l = x * x + y * y) {
          l = alpha * strengths[i] * ((l = Math.sqrt(l)) - distances[i]) / l;
          x *= l;
          y *= l;
          t.x -= x * (k = s.weight + t.weight ? s.weight / (s.weight + t.weight) : .5);
          t.y -= y * k;
          s.x += x * (k = 1 - k);
          s.y += y * k;
        }
      }
      if (k = alpha * gravity) {
        x = size[0] / 2;
        y = size[1] / 2;
        i = -1;
        if (k) while (++i < n) {
          o = nodes[i];
          o.x += (x - o.x) * k;
          o.y += (y - o.y) * k;
        }
      }
      if (charge) {
        d3_layout_forceAccumulate(q = d3.geom.quadtree(nodes), alpha, charges);
        i = -1;
        while (++i < n) {
          if (!(o = nodes[i]).fixed) {
            q.visit(repulse(o));
          }
        }
      }
      i = -1;
      while (++i < n) {
        o = nodes[i];
        if (o.fixed) {
          o.x = o.px;
          o.y = o.py;
        } else {
          o.x -= (o.px - (o.px = o.x)) * friction;
          o.y -= (o.py - (o.py = o.y)) * friction;
        }
      }
      event.tick({
        type: "tick",
        alpha: alpha
      });
    };
    force.nodes = function(x) {
      if (!arguments.length) return nodes;
      nodes = x;
      return force;
    };
    force.links = function(x) {
      if (!arguments.length) return links;
      links = x;
      return force;
    };
    force.size = function(x) {
      if (!arguments.length) return size;
      size = x;
      return force;
    };
    force.linkDistance = function(x) {
      if (!arguments.length) return linkDistance;
      linkDistance = typeof x === "function" ? x : +x;
      return force;
    };
    force.distance = force.linkDistance;
    force.linkStrength = function(x) {
      if (!arguments.length) return linkStrength;
      linkStrength = typeof x === "function" ? x : +x;
      return force;
    };
    force.friction = function(x) {
      if (!arguments.length) return friction;
      friction = +x;
      return force;
    };
    force.charge = function(x) {
      if (!arguments.length) return charge;
      charge = typeof x === "function" ? x : +x;
      return force;
    };
    force.chargeDistance = function(x) {
      if (!arguments.length) return Math.sqrt(chargeDistance2);
      chargeDistance2 = x * x;
      return force;
    };
    force.gravity = function(x) {
      if (!arguments.length) return gravity;
      gravity = +x;
      return force;
    };
    force.theta = function(x) {
      if (!arguments.length) return Math.sqrt(theta2);
      theta2 = x * x;
      return force;
    };
    force.alpha = function(x) {
      if (!arguments.length) return alpha;
      x = +x;
      if (alpha) {
        if (x > 0) {
          alpha = x;
        } else {
          timer.c = null, timer.t = NaN, timer = null;
          event.end({
            type: "end",
            alpha: alpha = 0
          });
        }
      } else if (x > 0) {
        event.start({
          type: "start",
          alpha: alpha = x
        });
        timer = d3_timer(force.tick);
      }
      return force;
    };
    force.start = function() {
      var i, n = nodes.length, m = links.length, w = size[0], h = size[1], neighbors, o;
      for (i = 0; i < n; ++i) {
        (o = nodes[i]).index = i;
        o.weight = 0;
      }
      for (i = 0; i < m; ++i) {
        o = links[i];
        if (typeof o.source == "number") o.source = nodes[o.source];
        if (typeof o.target == "number") o.target = nodes[o.target];
        ++o.source.weight;
        ++o.target.weight;
      }
      for (i = 0; i < n; ++i) {
        o = nodes[i];
        if (isNaN(o.x)) o.x = position("x", w);
        if (isNaN(o.y)) o.y = position("y", h);
        if (isNaN(o.px)) o.px = o.x;
        if (isNaN(o.py)) o.py = o.y;
      }
      distances = [];
      if (typeof linkDistance === "function") for (i = 0; i < m; ++i) distances[i] = +linkDistance.call(this, links[i], i); else for (i = 0; i < m; ++i) distances[i] = linkDistance;
      strengths = [];
      if (typeof linkStrength === "function") for (i = 0; i < m; ++i) strengths[i] = +linkStrength.call(this, links[i], i); else for (i = 0; i < m; ++i) strengths[i] = linkStrength;
      charges = [];
      if (typeof charge === "function") for (i = 0; i < n; ++i) charges[i] = +charge.call(this, nodes[i], i); else for (i = 0; i < n; ++i) charges[i] = charge;
      function position(dimension, size) {
        if (!neighbors) {
          neighbors = new Array(n);
          for (j = 0; j < n; ++j) {
            neighbors[j] = [];
          }
          for (j = 0; j < m; ++j) {
            var o = links[j];
            neighbors[o.source.index].push(o.target);
            neighbors[o.target.index].push(o.source);
          }
        }
        var candidates = neighbors[i], j = -1, l = candidates.length, x;
        while (++j < l) if (!isNaN(x = candidates[j][dimension])) return x;
        return Math.random() * size;
      }
      return force.resume();
    };
    force.resume = function() {
      return force.alpha(.1);
    };
    force.stop = function() {
      return force.alpha(0);
    };
    force.drag = function() {
      if (!drag) drag = d3.behavior.drag().origin(d3_identity).on("dragstart.force", d3_layout_forceDragstart).on("drag.force", dragmove).on("dragend.force", d3_layout_forceDragend);
      if (!arguments.length) return drag;
      this.on("mouseover.force", d3_layout_forceMouseover).on("mouseout.force", d3_layout_forceMouseout).call(drag);
    };
    function dragmove(d) {
      d.px = d3.event.x, d.py = d3.event.y;
      force.resume();
    }
    return d3.rebind(force, event, "on");
  };
  function d3_layout_forceDragstart(d) {
    d.fixed |= 2;
  }
  function d3_layout_forceDragend(d) {
    d.fixed &= ~6;
  }
  function d3_layout_forceMouseover(d) {
    d.fixed |= 4;
    d.px = d.x, d.py = d.y;
  }
  function d3_layout_forceMouseout(d) {
    d.fixed &= ~4;
  }
  function d3_layout_forceAccumulate(quad, alpha, charges) {
    var cx = 0, cy = 0;
    quad.charge = 0;
    if (!quad.leaf) {
      var nodes = quad.nodes, n = nodes.length, i = -1, c;
      while (++i < n) {
        c = nodes[i];
        if (c == null) continue;
        d3_layout_forceAccumulate(c, alpha, charges);
        quad.charge += c.charge;
        cx += c.charge * c.cx;
        cy += c.charge * c.cy;
      }
    }
    if (quad.point) {
      if (!quad.leaf) {
        quad.point.x += Math.random() - .5;
        quad.point.y += Math.random() - .5;
      }
      var k = alpha * charges[quad.point.index];
      quad.charge += quad.pointCharge = k;
      cx += k * quad.point.x;
      cy += k * quad.point.y;
    }
    quad.cx = cx / quad.charge;
    quad.cy = cy / quad.charge;
  }
  var d3_layout_forceLinkDistance = 20, d3_layout_forceLinkStrength = 1, d3_layout_forceChargeDistance2 = Infinity;
  d3.layout.hierarchy = function() {
    var sort = d3_layout_hierarchySort, children = d3_layout_hierarchyChildren, value = d3_layout_hierarchyValue;
    function hierarchy(root) {
      var stack = [ root ], nodes = [], node;
      root.depth = 0;
      while ((node = stack.pop()) != null) {
        nodes.push(node);
        if ((childs = children.call(hierarchy, node, node.depth)) && (n = childs.length)) {
          var n, childs, child;
          while (--n >= 0) {
            stack.push(child = childs[n]);
            child.parent = node;
            child.depth = node.depth + 1;
          }
          if (value) node.value = 0;
          node.children = childs;
        } else {
          if (value) node.value = +value.call(hierarchy, node, node.depth) || 0;
          delete node.children;
        }
      }
      d3_layout_hierarchyVisitAfter(root, function(node) {
        var childs, parent;
        if (sort && (childs = node.children)) childs.sort(sort);
        if (value && (parent = node.parent)) parent.value += node.value;
      });
      return nodes;
    }
    hierarchy.sort = function(x) {
      if (!arguments.length) return sort;
      sort = x;
      return hierarchy;
    };
    hierarchy.children = function(x) {
      if (!arguments.length) return children;
      children = x;
      return hierarchy;
    };
    hierarchy.value = function(x) {
      if (!arguments.length) return value;
      value = x;
      return hierarchy;
    };
    hierarchy.revalue = function(root) {
      if (value) {
        d3_layout_hierarchyVisitBefore(root, function(node) {
          if (node.children) node.value = 0;
        });
        d3_layout_hierarchyVisitAfter(root, function(node) {
          var parent;
          if (!node.children) node.value = +value.call(hierarchy, node, node.depth) || 0;
          if (parent = node.parent) parent.value += node.value;
        });
      }
      return root;
    };
    return hierarchy;
  };
  function d3_layout_hierarchyRebind(object, hierarchy) {
    d3.rebind(object, hierarchy, "sort", "children", "value");
    object.nodes = object;
    object.links = d3_layout_hierarchyLinks;
    return object;
  }
  function d3_layout_hierarchyVisitBefore(node, callback) {
    var nodes = [ node ];
    while ((node = nodes.pop()) != null) {
      callback(node);
      if ((children = node.children) && (n = children.length)) {
        var n, children;
        while (--n >= 0) nodes.push(children[n]);
      }
    }
  }
  function d3_layout_hierarchyVisitAfter(node, callback) {
    var nodes = [ node ], nodes2 = [];
    while ((node = nodes.pop()) != null) {
      nodes2.push(node);
      if ((children = node.children) && (n = children.length)) {
        var i = -1, n, children;
        while (++i < n) nodes.push(children[i]);
      }
    }
    while ((node = nodes2.pop()) != null) {
      callback(node);
    }
  }
  function d3_layout_hierarchyChildren(d) {
    return d.children;
  }
  function d3_layout_hierarchyValue(d) {
    return d.value;
  }
  function d3_layout_hierarchySort(a, b) {
    return b.value - a.value;
  }
  function d3_layout_hierarchyLinks(nodes) {
    return d3.merge(nodes.map(function(parent) {
      return (parent.children || []).map(function(child) {
        return {
          source: parent,
          target: child
        };
      });
    }));
  }
  d3.layout.partition = function() {
    var hierarchy = d3.layout.hierarchy(), size = [ 1, 1 ];
    function position(node, x, dx, dy) {
      var children = node.children;
      node.x = x;
      node.y = node.depth * dy;
      node.dx = dx;
      node.dy = dy;
      if (children && (n = children.length)) {
        var i = -1, n, c, d;
        dx = node.value ? dx / node.value : 0;
        while (++i < n) {
          position(c = children[i], x, d = c.value * dx, dy);
          x += d;
        }
      }
    }
    function depth(node) {
      var children = node.children, d = 0;
      if (children && (n = children.length)) {
        var i = -1, n;
        while (++i < n) d = Math.max(d, depth(children[i]));
      }
      return 1 + d;
    }
    function partition(d, i) {
      var nodes = hierarchy.call(this, d, i);
      position(nodes[0], 0, size[0], size[1] / depth(nodes[0]));
      return nodes;
    }
    partition.size = function(x) {
      if (!arguments.length) return size;
      size = x;
      return partition;
    };
    return d3_layout_hierarchyRebind(partition, hierarchy);
  };
  d3.layout.pie = function() {
    var value = Number, sort = d3_layout_pieSortByValue, startAngle = 0, endAngle = τ, padAngle = 0;
    function pie(data) {
      var n = data.length, values = data.map(function(d, i) {
        return +value.call(pie, d, i);
      }), a = +(typeof startAngle === "function" ? startAngle.apply(this, arguments) : startAngle), da = (typeof endAngle === "function" ? endAngle.apply(this, arguments) : endAngle) - a, p = Math.min(Math.abs(da) / n, +(typeof padAngle === "function" ? padAngle.apply(this, arguments) : padAngle)), pa = p * (da < 0 ? -1 : 1), sum = d3.sum(values), k = sum ? (da - n * pa) / sum : 0, index = d3.range(n), arcs = [], v;
      if (sort != null) index.sort(sort === d3_layout_pieSortByValue ? function(i, j) {
        return values[j] - values[i];
      } : function(i, j) {
        return sort(data[i], data[j]);
      });
      index.forEach(function(i) {
        arcs[i] = {
          data: data[i],
          value: v = values[i],
          startAngle: a,
          endAngle: a += v * k + pa,
          padAngle: p
        };
      });
      return arcs;
    }
    pie.value = function(_) {
      if (!arguments.length) return value;
      value = _;
      return pie;
    };
    pie.sort = function(_) {
      if (!arguments.length) return sort;
      sort = _;
      return pie;
    };
    pie.startAngle = function(_) {
      if (!arguments.length) return startAngle;
      startAngle = _;
      return pie;
    };
    pie.endAngle = function(_) {
      if (!arguments.length) return endAngle;
      endAngle = _;
      return pie;
    };
    pie.padAngle = function(_) {
      if (!arguments.length) return padAngle;
      padAngle = _;
      return pie;
    };
    return pie;
  };
  var d3_layout_pieSortByValue = {};
  d3.layout.stack = function() {
    var values = d3_identity, order = d3_layout_stackOrderDefault, offset = d3_layout_stackOffsetZero, out = d3_layout_stackOut, x = d3_layout_stackX, y = d3_layout_stackY;
    function stack(data, index) {
      if (!(n = data.length)) return data;
      var series = data.map(function(d, i) {
        return values.call(stack, d, i);
      });
      var points = series.map(function(d) {
        return d.map(function(v, i) {
          return [ x.call(stack, v, i), y.call(stack, v, i) ];
        });
      });
      var orders = order.call(stack, points, index);
      series = d3.permute(series, orders);
      points = d3.permute(points, orders);
      var offsets = offset.call(stack, points, index);
      var m = series[0].length, n, i, j, o;
      for (j = 0; j < m; ++j) {
        out.call(stack, series[0][j], o = offsets[j], points[0][j][1]);
        for (i = 1; i < n; ++i) {
          out.call(stack, series[i][j], o += points[i - 1][j][1], points[i][j][1]);
        }
      }
      return data;
    }
    stack.values = function(x) {
      if (!arguments.length) return values;
      values = x;
      return stack;
    };
    stack.order = function(x) {
      if (!arguments.length) return order;
      order = typeof x === "function" ? x : d3_layout_stackOrders.get(x) || d3_layout_stackOrderDefault;
      return stack;
    };
    stack.offset = function(x) {
      if (!arguments.length) return offset;
      offset = typeof x === "function" ? x : d3_layout_stackOffsets.get(x) || d3_layout_stackOffsetZero;
      return stack;
    };
    stack.x = function(z) {
      if (!arguments.length) return x;
      x = z;
      return stack;
    };
    stack.y = function(z) {
      if (!arguments.length) return y;
      y = z;
      return stack;
    };
    stack.out = function(z) {
      if (!arguments.length) return out;
      out = z;
      return stack;
    };
    return stack;
  };
  function d3_layout_stackX(d) {
    return d.x;
  }
  function d3_layout_stackY(d) {
    return d.y;
  }
  function d3_layout_stackOut(d, y0, y) {
    d.y0 = y0;
    d.y = y;
  }
  var d3_layout_stackOrders = d3.map({
    "inside-out": function(data) {
      var n = data.length, i, j, max = data.map(d3_layout_stackMaxIndex), sums = data.map(d3_layout_stackReduceSum), index = d3.range(n).sort(function(a, b) {
        return max[a] - max[b];
      }), top = 0, bottom = 0, tops = [], bottoms = [];
      for (i = 0; i < n; ++i) {
        j = index[i];
        if (top < bottom) {
          top += sums[j];
          tops.push(j);
        } else {
          bottom += sums[j];
          bottoms.push(j);
        }
      }
      return bottoms.reverse().concat(tops);
    },
    reverse: function(data) {
      return d3.range(data.length).reverse();
    },
    "default": d3_layout_stackOrderDefault
  });
  var d3_layout_stackOffsets = d3.map({
    silhouette: function(data) {
      var n = data.length, m = data[0].length, sums = [], max = 0, i, j, o, y0 = [];
      for (j = 0; j < m; ++j) {
        for (i = 0, o = 0; i < n; i++) o += data[i][j][1];
        if (o > max) max = o;
        sums.push(o);
      }
      for (j = 0; j < m; ++j) {
        y0[j] = (max - sums[j]) / 2;
      }
      return y0;
    },
    wiggle: function(data) {
      var n = data.length, x = data[0], m = x.length, i, j, k, s1, s2, s3, dx, o, o0, y0 = [];
      y0[0] = o = o0 = 0;
      for (j = 1; j < m; ++j) {
        for (i = 0, s1 = 0; i < n; ++i) s1 += data[i][j][1];
        for (i = 0, s2 = 0, dx = x[j][0] - x[j - 1][0]; i < n; ++i) {
          for (k = 0, s3 = (data[i][j][1] - data[i][j - 1][1]) / (2 * dx); k < i; ++k) {
            s3 += (data[k][j][1] - data[k][j - 1][1]) / dx;
          }
          s2 += s3 * data[i][j][1];
        }
        y0[j] = o -= s1 ? s2 / s1 * dx : 0;
        if (o < o0) o0 = o;
      }
      for (j = 0; j < m; ++j) y0[j] -= o0;
      return y0;
    },
    expand: function(data) {
      var n = data.length, m = data[0].length, k = 1 / n, i, j, o, y0 = [];
      for (j = 0; j < m; ++j) {
        for (i = 0, o = 0; i < n; i++) o += data[i][j][1];
        if (o) for (i = 0; i < n; i++) data[i][j][1] /= o; else for (i = 0; i < n; i++) data[i][j][1] = k;
      }
      for (j = 0; j < m; ++j) y0[j] = 0;
      return y0;
    },
    zero: d3_layout_stackOffsetZero
  });
  function d3_layout_stackOrderDefault(data) {
    return d3.range(data.length);
  }
  function d3_layout_stackOffsetZero(data) {
    var j = -1, m = data[0].length, y0 = [];
    while (++j < m) y0[j] = 0;
    return y0;
  }
  function d3_layout_stackMaxIndex(array) {
    var i = 1, j = 0, v = array[0][1], k, n = array.length;
    for (;i < n; ++i) {
      if ((k = array[i][1]) > v) {
        j = i;
        v = k;
      }
    }
    return j;
  }
  function d3_layout_stackReduceSum(d) {
    return d.reduce(d3_layout_stackSum, 0);
  }
  function d3_layout_stackSum(p, d) {
    return p + d[1];
  }
  d3.layout.histogram = function() {
    var frequency = true, valuer = Number, ranger = d3_layout_histogramRange, binner = d3_layout_histogramBinSturges;
    function histogram(data, i) {
      var bins = [], values = data.map(valuer, this), range = ranger.call(this, values, i), thresholds = binner.call(this, range, values, i), bin, i = -1, n = values.length, m = thresholds.length - 1, k = frequency ? 1 : 1 / n, x;
      while (++i < m) {
        bin = bins[i] = [];
        bin.dx = thresholds[i + 1] - (bin.x = thresholds[i]);
        bin.y = 0;
      }
      if (m > 0) {
        i = -1;
        while (++i < n) {
          x = values[i];
          if (x >= range[0] && x <= range[1]) {
            bin = bins[d3.bisect(thresholds, x, 1, m) - 1];
            bin.y += k;
            bin.push(data[i]);
          }
        }
      }
      return bins;
    }
    histogram.value = function(x) {
      if (!arguments.length) return valuer;
      valuer = x;
      return histogram;
    };
    histogram.range = function(x) {
      if (!arguments.length) return ranger;
      ranger = d3_functor(x);
      return histogram;
    };
    histogram.bins = function(x) {
      if (!arguments.length) return binner;
      binner = typeof x === "number" ? function(range) {
        return d3_layout_histogramBinFixed(range, x);
      } : d3_functor(x);
      return histogram;
    };
    histogram.frequency = function(x) {
      if (!arguments.length) return frequency;
      frequency = !!x;
      return histogram;
    };
    return histogram;
  };
  function d3_layout_histogramBinSturges(range, values) {
    return d3_layout_histogramBinFixed(range, Math.ceil(Math.log(values.length) / Math.LN2 + 1));
  }
  function d3_layout_histogramBinFixed(range, n) {
    var x = -1, b = +range[0], m = (range[1] - b) / n, f = [];
    while (++x <= n) f[x] = m * x + b;
    return f;
  }
  function d3_layout_histogramRange(values) {
    return [ d3.min(values), d3.max(values) ];
  }
  d3.layout.pack = function() {
    var hierarchy = d3.layout.hierarchy().sort(d3_layout_packSort), padding = 0, size = [ 1, 1 ], radius;
    function pack(d, i) {
      var nodes = hierarchy.call(this, d, i), root = nodes[0], w = size[0], h = size[1], r = radius == null ? Math.sqrt : typeof radius === "function" ? radius : function() {
        return radius;
      };
      root.x = root.y = 0;
      d3_layout_hierarchyVisitAfter(root, function(d) {
        d.r = +r(d.value);
      });
      d3_layout_hierarchyVisitAfter(root, d3_layout_packSiblings);
      if (padding) {
        var dr = padding * (radius ? 1 : Math.max(2 * root.r / w, 2 * root.r / h)) / 2;
        d3_layout_hierarchyVisitAfter(root, function(d) {
          d.r += dr;
        });
        d3_layout_hierarchyVisitAfter(root, d3_layout_packSiblings);
        d3_layout_hierarchyVisitAfter(root, function(d) {
          d.r -= dr;
        });
      }
      d3_layout_packTransform(root, w / 2, h / 2, radius ? 1 : 1 / Math.max(2 * root.r / w, 2 * root.r / h));
      return nodes;
    }
    pack.size = function(_) {
      if (!arguments.length) return size;
      size = _;
      return pack;
    };
    pack.radius = function(_) {
      if (!arguments.length) return radius;
      radius = _ == null || typeof _ === "function" ? _ : +_;
      return pack;
    };
    pack.padding = function(_) {
      if (!arguments.length) return padding;
      padding = +_;
      return pack;
    };
    return d3_layout_hierarchyRebind(pack, hierarchy);
  };
  function d3_layout_packSort(a, b) {
    return a.value - b.value;
  }
  function d3_layout_packInsert(a, b) {
    var c = a._pack_next;
    a._pack_next = b;
    b._pack_prev = a;
    b._pack_next = c;
    c._pack_prev = b;
  }
  function d3_layout_packSplice(a, b) {
    a._pack_next = b;
    b._pack_prev = a;
  }
  function d3_layout_packIntersects(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, dr = a.r + b.r;
    return .999 * dr * dr > dx * dx + dy * dy;
  }
  function d3_layout_packSiblings(node) {
    if (!(nodes = node.children) || !(n = nodes.length)) return;
    var nodes, xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity, a, b, c, i, j, k, n;
    function bound(node) {
      xMin = Math.min(node.x - node.r, xMin);
      xMax = Math.max(node.x + node.r, xMax);
      yMin = Math.min(node.y - node.r, yMin);
      yMax = Math.max(node.y + node.r, yMax);
    }
    nodes.forEach(d3_layout_packLink);
    a = nodes[0];
    a.x = -a.r;
    a.y = 0;
    bound(a);
    if (n > 1) {
      b = nodes[1];
      b.x = b.r;
      b.y = 0;
      bound(b);
      if (n > 2) {
        c = nodes[2];
        d3_layout_packPlace(a, b, c);
        bound(c);
        d3_layout_packInsert(a, c);
        a._pack_prev = c;
        d3_layout_packInsert(c, b);
        b = a._pack_next;
        for (i = 3; i < n; i++) {
          d3_layout_packPlace(a, b, c = nodes[i]);
          var isect = 0, s1 = 1, s2 = 1;
          for (j = b._pack_next; j !== b; j = j._pack_next, s1++) {
            if (d3_layout_packIntersects(j, c)) {
              isect = 1;
              break;
            }
          }
          if (isect == 1) {
            for (k = a._pack_prev; k !== j._pack_prev; k = k._pack_prev, s2++) {
              if (d3_layout_packIntersects(k, c)) {
                break;
              }
            }
          }
          if (isect) {
            if (s1 < s2 || s1 == s2 && b.r < a.r) d3_layout_packSplice(a, b = j); else d3_layout_packSplice(a = k, b);
            i--;
          } else {
            d3_layout_packInsert(a, c);
            b = c;
            bound(c);
          }
        }
      }
    }
    var cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2, cr = 0;
    for (i = 0; i < n; i++) {
      c = nodes[i];
      c.x -= cx;
      c.y -= cy;
      cr = Math.max(cr, c.r + Math.sqrt(c.x * c.x + c.y * c.y));
    }
    node.r = cr;
    nodes.forEach(d3_layout_packUnlink);
  }
  function d3_layout_packLink(node) {
    node._pack_next = node._pack_prev = node;
  }
  function d3_layout_packUnlink(node) {
    delete node._pack_next;
    delete node._pack_prev;
  }
  function d3_layout_packTransform(node, x, y, k) {
    var children = node.children;
    node.x = x += k * node.x;
    node.y = y += k * node.y;
    node.r *= k;
    if (children) {
      var i = -1, n = children.length;
      while (++i < n) d3_layout_packTransform(children[i], x, y, k);
    }
  }
  function d3_layout_packPlace(a, b, c) {
    var db = a.r + c.r, dx = b.x - a.x, dy = b.y - a.y;
    if (db && (dx || dy)) {
      var da = b.r + c.r, dc = dx * dx + dy * dy;
      da *= da;
      db *= db;
      var x = .5 + (db - da) / (2 * dc), y = Math.sqrt(Math.max(0, 2 * da * (db + dc) - (db -= dc) * db - da * da)) / (2 * dc);
      c.x = a.x + x * dx + y * dy;
      c.y = a.y + x * dy - y * dx;
    } else {
      c.x = a.x + db;
      c.y = a.y;
    }
  }
  d3.layout.tree = function() {
    var hierarchy = d3.layout.hierarchy().sort(null).value(null), separation = d3_layout_treeSeparation, size = [ 1, 1 ], nodeSize = null;
    function tree(d, i) {
      var nodes = hierarchy.call(this, d, i), root0 = nodes[0], root1 = wrapTree(root0);
      d3_layout_hierarchyVisitAfter(root1, firstWalk), root1.parent.m = -root1.z;
      d3_layout_hierarchyVisitBefore(root1, secondWalk);
      if (nodeSize) d3_layout_hierarchyVisitBefore(root0, sizeNode); else {
        var left = root0, right = root0, bottom = root0;
        d3_layout_hierarchyVisitBefore(root0, function(node) {
          if (node.x < left.x) left = node;
          if (node.x > right.x) right = node;
          if (node.depth > bottom.depth) bottom = node;
        });
        var tx = separation(left, right) / 2 - left.x, kx = size[0] / (right.x + separation(right, left) / 2 + tx), ky = size[1] / (bottom.depth || 1);
        d3_layout_hierarchyVisitBefore(root0, function(node) {
          node.x = (node.x + tx) * kx;
          node.y = node.depth * ky;
        });
      }
      return nodes;
    }
    function wrapTree(root0) {
      var root1 = {
        A: null,
        children: [ root0 ]
      }, queue = [ root1 ], node1;
      while ((node1 = queue.pop()) != null) {
        for (var children = node1.children, child, i = 0, n = children.length; i < n; ++i) {
          queue.push((children[i] = child = {
            _: children[i],
            parent: node1,
            children: (child = children[i].children) && child.slice() || [],
            A: null,
            a: null,
            z: 0,
            m: 0,
            c: 0,
            s: 0,
            t: null,
            i: i
          }).a = child);
        }
      }
      return root1.children[0];
    }
    function firstWalk(v) {
      var children = v.children, siblings = v.parent.children, w = v.i ? siblings[v.i - 1] : null;
      if (children.length) {
        d3_layout_treeShift(v);
        var midpoint = (children[0].z + children[children.length - 1].z) / 2;
        if (w) {
          v.z = w.z + separation(v._, w._);
          v.m = v.z - midpoint;
        } else {
          v.z = midpoint;
        }
      } else if (w) {
        v.z = w.z + separation(v._, w._);
      }
      v.parent.A = apportion(v, w, v.parent.A || siblings[0]);
    }
    function secondWalk(v) {
      v._.x = v.z + v.parent.m;
      v.m += v.parent.m;
    }
    function apportion(v, w, ancestor) {
      if (w) {
        var vip = v, vop = v, vim = w, vom = vip.parent.children[0], sip = vip.m, sop = vop.m, sim = vim.m, som = vom.m, shift;
        while (vim = d3_layout_treeRight(vim), vip = d3_layout_treeLeft(vip), vim && vip) {
          vom = d3_layout_treeLeft(vom);
          vop = d3_layout_treeRight(vop);
          vop.a = v;
          shift = vim.z + sim - vip.z - sip + separation(vim._, vip._);
          if (shift > 0) {
            d3_layout_treeMove(d3_layout_treeAncestor(vim, v, ancestor), v, shift);
            sip += shift;
            sop += shift;
          }
          sim += vim.m;
          sip += vip.m;
          som += vom.m;
          sop += vop.m;
        }
        if (vim && !d3_layout_treeRight(vop)) {
          vop.t = vim;
          vop.m += sim - sop;
        }
        if (vip && !d3_layout_treeLeft(vom)) {
          vom.t = vip;
          vom.m += sip - som;
          ancestor = v;
        }
      }
      return ancestor;
    }
    function sizeNode(node) {
      node.x *= size[0];
      node.y = node.depth * size[1];
    }
    tree.separation = function(x) {
      if (!arguments.length) return separation;
      separation = x;
      return tree;
    };
    tree.size = function(x) {
      if (!arguments.length) return nodeSize ? null : size;
      nodeSize = (size = x) == null ? sizeNode : null;
      return tree;
    };
    tree.nodeSize = function(x) {
      if (!arguments.length) return nodeSize ? size : null;
      nodeSize = (size = x) == null ? null : sizeNode;
      return tree;
    };
    return d3_layout_hierarchyRebind(tree, hierarchy);
  };
  function d3_layout_treeSeparation(a, b) {
    return a.parent == b.parent ? 1 : 2;
  }
  function d3_layout_treeLeft(v) {
    var children = v.children;
    return children.length ? children[0] : v.t;
  }
  function d3_layout_treeRight(v) {
    var children = v.children, n;
    return (n = children.length) ? children[n - 1] : v.t;
  }
  function d3_layout_treeMove(wm, wp, shift) {
    var change = shift / (wp.i - wm.i);
    wp.c -= change;
    wp.s += shift;
    wm.c += change;
    wp.z += shift;
    wp.m += shift;
  }
  function d3_layout_treeShift(v) {
    var shift = 0, change = 0, children = v.children, i = children.length, w;
    while (--i >= 0) {
      w = children[i];
      w.z += shift;
      w.m += shift;
      shift += w.s + (change += w.c);
    }
  }
  function d3_layout_treeAncestor(vim, v, ancestor) {
    return vim.a.parent === v.parent ? vim.a : ancestor;
  }
  d3.layout.cluster = function() {
    var hierarchy = d3.layout.hierarchy().sort(null).value(null), separation = d3_layout_treeSeparation, size = [ 1, 1 ], nodeSize = false;
    function cluster(d, i) {
      var nodes = hierarchy.call(this, d, i), root = nodes[0], previousNode, x = 0;
      d3_layout_hierarchyVisitAfter(root, function(node) {
        var children = node.children;
        if (children && children.length) {
          node.x = d3_layout_clusterX(children);
          node.y = d3_layout_clusterY(children);
        } else {
          node.x = previousNode ? x += separation(node, previousNode) : 0;
          node.y = 0;
          previousNode = node;
        }
      });
      var left = d3_layout_clusterLeft(root), right = d3_layout_clusterRight(root), x0 = left.x - separation(left, right) / 2, x1 = right.x + separation(right, left) / 2;
      d3_layout_hierarchyVisitAfter(root, nodeSize ? function(node) {
        node.x = (node.x - root.x) * size[0];
        node.y = (root.y - node.y) * size[1];
      } : function(node) {
        node.x = (node.x - x0) / (x1 - x0) * size[0];
        node.y = (1 - (root.y ? node.y / root.y : 1)) * size[1];
      });
      return nodes;
    }
    cluster.separation = function(x) {
      if (!arguments.length) return separation;
      separation = x;
      return cluster;
    };
    cluster.size = function(x) {
      if (!arguments.length) return nodeSize ? null : size;
      nodeSize = (size = x) == null;
      return cluster;
    };
    cluster.nodeSize = function(x) {
      if (!arguments.length) return nodeSize ? size : null;
      nodeSize = (size = x) != null;
      return cluster;
    };
    return d3_layout_hierarchyRebind(cluster, hierarchy);
  };
  function d3_layout_clusterY(children) {
    return 1 + d3.max(children, function(child) {
      return child.y;
    });
  }
  function d3_layout_clusterX(children) {
    return children.reduce(function(x, child) {
      return x + child.x;
    }, 0) / children.length;
  }
  function d3_layout_clusterLeft(node) {
    var children = node.children;
    return children && children.length ? d3_layout_clusterLeft(children[0]) : node;
  }
  function d3_layout_clusterRight(node) {
    var children = node.children, n;
    return children && (n = children.length) ? d3_layout_clusterRight(children[n - 1]) : node;
  }
  d3.layout.treemap = function() {
    var hierarchy = d3.layout.hierarchy(), round = Math.round, size = [ 1, 1 ], padding = null, pad = d3_layout_treemapPadNull, sticky = false, stickies, mode = "squarify", ratio = .5 * (1 + Math.sqrt(5));
    function scale(children, k) {
      var i = -1, n = children.length, child, area;
      while (++i < n) {
        area = (child = children[i]).value * (k < 0 ? 0 : k);
        child.area = isNaN(area) || area <= 0 ? 0 : area;
      }
    }
    function squarify(node) {
      var children = node.children;
      if (children && children.length) {
        var rect = pad(node), row = [], remaining = children.slice(), child, best = Infinity, score, u = mode === "slice" ? rect.dx : mode === "dice" ? rect.dy : mode === "slice-dice" ? node.depth & 1 ? rect.dy : rect.dx : Math.min(rect.dx, rect.dy), n;
        scale(remaining, rect.dx * rect.dy / node.value);
        row.area = 0;
        while ((n = remaining.length) > 0) {
          row.push(child = remaining[n - 1]);
          row.area += child.area;
          if (mode !== "squarify" || (score = worst(row, u)) <= best) {
            remaining.pop();
            best = score;
          } else {
            row.area -= row.pop().area;
            position(row, u, rect, false);
            u = Math.min(rect.dx, rect.dy);
            row.length = row.area = 0;
            best = Infinity;
          }
        }
        if (row.length) {
          position(row, u, rect, true);
          row.length = row.area = 0;
        }
        children.forEach(squarify);
      }
    }
    function stickify(node) {
      var children = node.children;
      if (children && children.length) {
        var rect = pad(node), remaining = children.slice(), child, row = [];
        scale(remaining, rect.dx * rect.dy / node.value);
        row.area = 0;
        while (child = remaining.pop()) {
          row.push(child);
          row.area += child.area;
          if (child.z != null) {
            position(row, child.z ? rect.dx : rect.dy, rect, !remaining.length);
            row.length = row.area = 0;
          }
        }
        children.forEach(stickify);
      }
    }
    function worst(row, u) {
      var s = row.area, r, rmax = 0, rmin = Infinity, i = -1, n = row.length;
      while (++i < n) {
        if (!(r = row[i].area)) continue;
        if (r < rmin) rmin = r;
        if (r > rmax) rmax = r;
      }
      s *= s;
      u *= u;
      return s ? Math.max(u * rmax * ratio / s, s / (u * rmin * ratio)) : Infinity;
    }
    function position(row, u, rect, flush) {
      var i = -1, n = row.length, x = rect.x, y = rect.y, v = u ? round(row.area / u) : 0, o;
      if (u == rect.dx) {
        if (flush || v > rect.dy) v = rect.dy;
        while (++i < n) {
          o = row[i];
          o.x = x;
          o.y = y;
          o.dy = v;
          x += o.dx = Math.min(rect.x + rect.dx - x, v ? round(o.area / v) : 0);
        }
        o.z = true;
        o.dx += rect.x + rect.dx - x;
        rect.y += v;
        rect.dy -= v;
      } else {
        if (flush || v > rect.dx) v = rect.dx;
        while (++i < n) {
          o = row[i];
          o.x = x;
          o.y = y;
          o.dx = v;
          y += o.dy = Math.min(rect.y + rect.dy - y, v ? round(o.area / v) : 0);
        }
        o.z = false;
        o.dy += rect.y + rect.dy - y;
        rect.x += v;
        rect.dx -= v;
      }
    }
    function treemap(d) {
      var nodes = stickies || hierarchy(d), root = nodes[0];
      root.x = root.y = 0;
      if (root.value) root.dx = size[0], root.dy = size[1]; else root.dx = root.dy = 0;
      if (stickies) hierarchy.revalue(root);
      scale([ root ], root.dx * root.dy / root.value);
      (stickies ? stickify : squarify)(root);
      if (sticky) stickies = nodes;
      return nodes;
    }
    treemap.size = function(x) {
      if (!arguments.length) return size;
      size = x;
      return treemap;
    };
    treemap.padding = function(x) {
      if (!arguments.length) return padding;
      function padFunction(node) {
        var p = x.call(treemap, node, node.depth);
        return p == null ? d3_layout_treemapPadNull(node) : d3_layout_treemapPad(node, typeof p === "number" ? [ p, p, p, p ] : p);
      }
      function padConstant(node) {
        return d3_layout_treemapPad(node, x);
      }
      var type;
      pad = (padding = x) == null ? d3_layout_treemapPadNull : (type = typeof x) === "function" ? padFunction : type === "number" ? (x = [ x, x, x, x ], 
      padConstant) : padConstant;
      return treemap;
    };
    treemap.round = function(x) {
      if (!arguments.length) return round != Number;
      round = x ? Math.round : Number;
      return treemap;
    };
    treemap.sticky = function(x) {
      if (!arguments.length) return sticky;
      sticky = x;
      stickies = null;
      return treemap;
    };
    treemap.ratio = function(x) {
      if (!arguments.length) return ratio;
      ratio = x;
      return treemap;
    };
    treemap.mode = function(x) {
      if (!arguments.length) return mode;
      mode = x + "";
      return treemap;
    };
    return d3_layout_hierarchyRebind(treemap, hierarchy);
  };
  function d3_layout_treemapPadNull(node) {
    return {
      x: node.x,
      y: node.y,
      dx: node.dx,
      dy: node.dy
    };
  }
  function d3_layout_treemapPad(node, padding) {
    var x = node.x + padding[3], y = node.y + padding[0], dx = node.dx - padding[1] - padding[3], dy = node.dy - padding[0] - padding[2];
    if (dx < 0) {
      x += dx / 2;
      dx = 0;
    }
    if (dy < 0) {
      y += dy / 2;
      dy = 0;
    }
    return {
      x: x,
      y: y,
      dx: dx,
      dy: dy
    };
  }
  d3.random = {
    normal: function(µ, σ) {
      var n = arguments.length;
      if (n < 2) σ = 1;
      if (n < 1) µ = 0;
      return function() {
        var x, y, r;
        do {
          x = Math.random() * 2 - 1;
          y = Math.random() * 2 - 1;
          r = x * x + y * y;
        } while (!r || r > 1);
        return µ + σ * x * Math.sqrt(-2 * Math.log(r) / r);
      };
    },
    logNormal: function() {
      var random = d3.random.normal.apply(d3, arguments);
      return function() {
        return Math.exp(random());
      };
    },
    bates: function(m) {
      var random = d3.random.irwinHall(m);
      return function() {
        return random() / m;
      };
    },
    irwinHall: function(m) {
      return function() {
        for (var s = 0, j = 0; j < m; j++) s += Math.random();
        return s;
      };
    }
  };
  d3.scale = {};
  function d3_scaleExtent(domain) {
    var start = domain[0], stop = domain[domain.length - 1];
    return start < stop ? [ start, stop ] : [ stop, start ];
  }
  function d3_scaleRange(scale) {
    return scale.rangeExtent ? scale.rangeExtent() : d3_scaleExtent(scale.range());
  }
  function d3_scale_bilinear(domain, range, uninterpolate, interpolate) {
    var u = uninterpolate(domain[0], domain[1]), i = interpolate(range[0], range[1]);
    return function(x) {
      return i(u(x));
    };
  }
  function d3_scale_nice(domain, nice) {
    var i0 = 0, i1 = domain.length - 1, x0 = domain[i0], x1 = domain[i1], dx;
    if (x1 < x0) {
      dx = i0, i0 = i1, i1 = dx;
      dx = x0, x0 = x1, x1 = dx;
    }
    domain[i0] = nice.floor(x0);
    domain[i1] = nice.ceil(x1);
    return domain;
  }
  function d3_scale_niceStep(step) {
    return step ? {
      floor: function(x) {
        return Math.floor(x / step) * step;
      },
      ceil: function(x) {
        return Math.ceil(x / step) * step;
      }
    } : d3_scale_niceIdentity;
  }
  var d3_scale_niceIdentity = {
    floor: d3_identity,
    ceil: d3_identity
  };
  function d3_scale_polylinear(domain, range, uninterpolate, interpolate) {
    var u = [], i = [], j = 0, k = Math.min(domain.length, range.length) - 1;
    if (domain[k] < domain[0]) {
      domain = domain.slice().reverse();
      range = range.slice().reverse();
    }
    while (++j <= k) {
      u.push(uninterpolate(domain[j - 1], domain[j]));
      i.push(interpolate(range[j - 1], range[j]));
    }
    return function(x) {
      var j = d3.bisect(domain, x, 1, k) - 1;
      return i[j](u[j](x));
    };
  }
  d3.scale.linear = function() {
    return d3_scale_linear([ 0, 1 ], [ 0, 1 ], d3_interpolate, false);
  };
  function d3_scale_linear(domain, range, interpolate, clamp) {
    var output, input;
    function rescale() {
      var linear = Math.min(domain.length, range.length) > 2 ? d3_scale_polylinear : d3_scale_bilinear, uninterpolate = clamp ? d3_uninterpolateClamp : d3_uninterpolateNumber;
      output = linear(domain, range, uninterpolate, interpolate);
      input = linear(range, domain, uninterpolate, d3_interpolate);
      return scale;
    }
    function scale(x) {
      return output(x);
    }
    scale.invert = function(y) {
      return input(y);
    };
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      domain = x.map(Number);
      return rescale();
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      return rescale();
    };
    scale.rangeRound = function(x) {
      return scale.range(x).interpolate(d3_interpolateRound);
    };
    scale.clamp = function(x) {
      if (!arguments.length) return clamp;
      clamp = x;
      return rescale();
    };
    scale.interpolate = function(x) {
      if (!arguments.length) return interpolate;
      interpolate = x;
      return rescale();
    };
    scale.ticks = function(m) {
      return d3_scale_linearTicks(domain, m);
    };
    scale.tickFormat = function(m, format) {
      return d3_scale_linearTickFormat(domain, m, format);
    };
    scale.nice = function(m) {
      d3_scale_linearNice(domain, m);
      return rescale();
    };
    scale.copy = function() {
      return d3_scale_linear(domain, range, interpolate, clamp);
    };
    return rescale();
  }
  function d3_scale_linearRebind(scale, linear) {
    return d3.rebind(scale, linear, "range", "rangeRound", "interpolate", "clamp");
  }
  function d3_scale_linearNice(domain, m) {
    d3_scale_nice(domain, d3_scale_niceStep(d3_scale_linearTickRange(domain, m)[2]));
    d3_scale_nice(domain, d3_scale_niceStep(d3_scale_linearTickRange(domain, m)[2]));
    return domain;
  }
  function d3_scale_linearTickRange(domain, m) {
    if (m == null) m = 10;
    var extent = d3_scaleExtent(domain), span = extent[1] - extent[0], step = Math.pow(10, Math.floor(Math.log(span / m) / Math.LN10)), err = m / span * step;
    if (err <= .15) step *= 10; else if (err <= .35) step *= 5; else if (err <= .75) step *= 2;
    extent[0] = Math.ceil(extent[0] / step) * step;
    extent[1] = Math.floor(extent[1] / step) * step + step * .5;
    extent[2] = step;
    return extent;
  }
  function d3_scale_linearTicks(domain, m) {
    return d3.range.apply(d3, d3_scale_linearTickRange(domain, m));
  }
  function d3_scale_linearTickFormat(domain, m, format) {
    var range = d3_scale_linearTickRange(domain, m);
    if (format) {
      var match = d3_format_re.exec(format);
      match.shift();
      if (match[8] === "s") {
        var prefix = d3.formatPrefix(Math.max(abs(range[0]), abs(range[1])));
        if (!match[7]) match[7] = "." + d3_scale_linearPrecision(prefix.scale(range[2]));
        match[8] = "f";
        format = d3.format(match.join(""));
        return function(d) {
          return format(prefix.scale(d)) + prefix.symbol;
        };
      }
      if (!match[7]) match[7] = "." + d3_scale_linearFormatPrecision(match[8], range);
      format = match.join("");
    } else {
      format = ",." + d3_scale_linearPrecision(range[2]) + "f";
    }
    return d3.format(format);
  }
  var d3_scale_linearFormatSignificant = {
    s: 1,
    g: 1,
    p: 1,
    r: 1,
    e: 1
  };
  function d3_scale_linearPrecision(value) {
    return -Math.floor(Math.log(value) / Math.LN10 + .01);
  }
  function d3_scale_linearFormatPrecision(type, range) {
    var p = d3_scale_linearPrecision(range[2]);
    return type in d3_scale_linearFormatSignificant ? Math.abs(p - d3_scale_linearPrecision(Math.max(abs(range[0]), abs(range[1])))) + +(type !== "e") : p - (type === "%") * 2;
  }
  d3.scale.log = function() {
    return d3_scale_log(d3.scale.linear().domain([ 0, 1 ]), 10, true, [ 1, 10 ]);
  };
  function d3_scale_log(linear, base, positive, domain) {
    function log(x) {
      return (positive ? Math.log(x < 0 ? 0 : x) : -Math.log(x > 0 ? 0 : -x)) / Math.log(base);
    }
    function pow(x) {
      return positive ? Math.pow(base, x) : -Math.pow(base, -x);
    }
    function scale(x) {
      return linear(log(x));
    }
    scale.invert = function(x) {
      return pow(linear.invert(x));
    };
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      positive = x[0] >= 0;
      linear.domain((domain = x.map(Number)).map(log));
      return scale;
    };
    scale.base = function(_) {
      if (!arguments.length) return base;
      base = +_;
      linear.domain(domain.map(log));
      return scale;
    };
    scale.nice = function() {
      var niced = d3_scale_nice(domain.map(log), positive ? Math : d3_scale_logNiceNegative);
      linear.domain(niced);
      domain = niced.map(pow);
      return scale;
    };
    scale.ticks = function() {
      var extent = d3_scaleExtent(domain), ticks = [], u = extent[0], v = extent[1], i = Math.floor(log(u)), j = Math.ceil(log(v)), n = base % 1 ? 2 : base;
      if (isFinite(j - i)) {
        if (positive) {
          for (;i < j; i++) for (var k = 1; k < n; k++) ticks.push(pow(i) * k);
          ticks.push(pow(i));
        } else {
          ticks.push(pow(i));
          for (;i++ < j; ) for (var k = n - 1; k > 0; k--) ticks.push(pow(i) * k);
        }
        for (i = 0; ticks[i] < u; i++) {}
        for (j = ticks.length; ticks[j - 1] > v; j--) {}
        ticks = ticks.slice(i, j);
      }
      return ticks;
    };
    scale.tickFormat = function(n, format) {
      if (!arguments.length) return d3_scale_logFormat;
      if (arguments.length < 2) format = d3_scale_logFormat; else if (typeof format !== "function") format = d3.format(format);
      var k = Math.max(1, base * n / scale.ticks().length);
      return function(d) {
        var i = d / pow(Math.round(log(d)));
        if (i * base < base - .5) i *= base;
        return i <= k ? format(d) : "";
      };
    };
    scale.copy = function() {
      return d3_scale_log(linear.copy(), base, positive, domain);
    };
    return d3_scale_linearRebind(scale, linear);
  }
  var d3_scale_logFormat = d3.format(".0e"), d3_scale_logNiceNegative = {
    floor: function(x) {
      return -Math.ceil(-x);
    },
    ceil: function(x) {
      return -Math.floor(-x);
    }
  };
  d3.scale.pow = function() {
    return d3_scale_pow(d3.scale.linear(), 1, [ 0, 1 ]);
  };
  function d3_scale_pow(linear, exponent, domain) {
    var powp = d3_scale_powPow(exponent), powb = d3_scale_powPow(1 / exponent);
    function scale(x) {
      return linear(powp(x));
    }
    scale.invert = function(x) {
      return powb(linear.invert(x));
    };
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      linear.domain((domain = x.map(Number)).map(powp));
      return scale;
    };
    scale.ticks = function(m) {
      return d3_scale_linearTicks(domain, m);
    };
    scale.tickFormat = function(m, format) {
      return d3_scale_linearTickFormat(domain, m, format);
    };
    scale.nice = function(m) {
      return scale.domain(d3_scale_linearNice(domain, m));
    };
    scale.exponent = function(x) {
      if (!arguments.length) return exponent;
      powp = d3_scale_powPow(exponent = x);
      powb = d3_scale_powPow(1 / exponent);
      linear.domain(domain.map(powp));
      return scale;
    };
    scale.copy = function() {
      return d3_scale_pow(linear.copy(), exponent, domain);
    };
    return d3_scale_linearRebind(scale, linear);
  }
  function d3_scale_powPow(e) {
    return function(x) {
      return x < 0 ? -Math.pow(-x, e) : Math.pow(x, e);
    };
  }
  d3.scale.sqrt = function() {
    return d3.scale.pow().exponent(.5);
  };
  d3.scale.ordinal = function() {
    return d3_scale_ordinal([], {
      t: "range",
      a: [ [] ]
    });
  };
  function d3_scale_ordinal(domain, ranger) {
    var index, range, rangeBand;
    function scale(x) {
      return range[((index.get(x) || (ranger.t === "range" ? index.set(x, domain.push(x)) : NaN)) - 1) % range.length];
    }
    function steps(start, step) {
      return d3.range(domain.length).map(function(i) {
        return start + step * i;
      });
    }
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      domain = [];
      index = new d3_Map();
      var i = -1, n = x.length, xi;
      while (++i < n) if (!index.has(xi = x[i])) index.set(xi, domain.push(xi));
      return scale[ranger.t].apply(scale, ranger.a);
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      rangeBand = 0;
      ranger = {
        t: "range",
        a: arguments
      };
      return scale;
    };
    scale.rangePoints = function(x, padding) {
      if (arguments.length < 2) padding = 0;
      var start = x[0], stop = x[1], step = domain.length < 2 ? (start = (start + stop) / 2, 
      0) : (stop - start) / (domain.length - 1 + padding);
      range = steps(start + step * padding / 2, step);
      rangeBand = 0;
      ranger = {
        t: "rangePoints",
        a: arguments
      };
      return scale;
    };
    scale.rangeRoundPoints = function(x, padding) {
      if (arguments.length < 2) padding = 0;
      var start = x[0], stop = x[1], step = domain.length < 2 ? (start = stop = Math.round((start + stop) / 2), 
      0) : (stop - start) / (domain.length - 1 + padding) | 0;
      range = steps(start + Math.round(step * padding / 2 + (stop - start - (domain.length - 1 + padding) * step) / 2), step);
      rangeBand = 0;
      ranger = {
        t: "rangeRoundPoints",
        a: arguments
      };
      return scale;
    };
    scale.rangeBands = function(x, padding, outerPadding) {
      if (arguments.length < 2) padding = 0;
      if (arguments.length < 3) outerPadding = padding;
      var reverse = x[1] < x[0], start = x[reverse - 0], stop = x[1 - reverse], step = (stop - start) / (domain.length - padding + 2 * outerPadding);
      range = steps(start + step * outerPadding, step);
      if (reverse) range.reverse();
      rangeBand = step * (1 - padding);
      ranger = {
        t: "rangeBands",
        a: arguments
      };
      return scale;
    };
    scale.rangeRoundBands = function(x, padding, outerPadding) {
      if (arguments.length < 2) padding = 0;
      if (arguments.length < 3) outerPadding = padding;
      var reverse = x[1] < x[0], start = x[reverse - 0], stop = x[1 - reverse], step = Math.floor((stop - start) / (domain.length - padding + 2 * outerPadding));
      range = steps(start + Math.round((stop - start - (domain.length - padding) * step) / 2), step);
      if (reverse) range.reverse();
      rangeBand = Math.round(step * (1 - padding));
      ranger = {
        t: "rangeRoundBands",
        a: arguments
      };
      return scale;
    };
    scale.rangeBand = function() {
      return rangeBand;
    };
    scale.rangeExtent = function() {
      return d3_scaleExtent(ranger.a[0]);
    };
    scale.copy = function() {
      return d3_scale_ordinal(domain, ranger);
    };
    return scale.domain(domain);
  }
  d3.scale.category10 = function() {
    return d3.scale.ordinal().range(d3_category10);
  };
  d3.scale.category20 = function() {
    return d3.scale.ordinal().range(d3_category20);
  };
  d3.scale.category20b = function() {
    return d3.scale.ordinal().range(d3_category20b);
  };
  d3.scale.category20c = function() {
    return d3.scale.ordinal().range(d3_category20c);
  };
  var d3_category10 = [ 2062260, 16744206, 2924588, 14034728, 9725885, 9197131, 14907330, 8355711, 12369186, 1556175 ].map(d3_rgbString);
  var d3_category20 = [ 2062260, 11454440, 16744206, 16759672, 2924588, 10018698, 14034728, 16750742, 9725885, 12955861, 9197131, 12885140, 14907330, 16234194, 8355711, 13092807, 12369186, 14408589, 1556175, 10410725 ].map(d3_rgbString);
  var d3_category20b = [ 3750777, 5395619, 7040719, 10264286, 6519097, 9216594, 11915115, 13556636, 9202993, 12426809, 15186514, 15190932, 8666169, 11356490, 14049643, 15177372, 8077683, 10834324, 13528509, 14589654 ].map(d3_rgbString);
  var d3_category20c = [ 3244733, 7057110, 10406625, 13032431, 15095053, 16616764, 16625259, 16634018, 3253076, 7652470, 10607003, 13101504, 7695281, 10394312, 12369372, 14342891, 6513507, 9868950, 12434877, 14277081 ].map(d3_rgbString);
  d3.scale.quantile = function() {
    return d3_scale_quantile([], []);
  };
  function d3_scale_quantile(domain, range) {
    var thresholds;
    function rescale() {
      var k = 0, q = range.length;
      thresholds = [];
      while (++k < q) thresholds[k - 1] = d3.quantile(domain, k / q);
      return scale;
    }
    function scale(x) {
      if (!isNaN(x = +x)) return range[d3.bisect(thresholds, x)];
    }
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      domain = x.map(d3_number).filter(d3_numeric).sort(d3_ascending);
      return rescale();
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      return rescale();
    };
    scale.quantiles = function() {
      return thresholds;
    };
    scale.invertExtent = function(y) {
      y = range.indexOf(y);
      return y < 0 ? [ NaN, NaN ] : [ y > 0 ? thresholds[y - 1] : domain[0], y < thresholds.length ? thresholds[y] : domain[domain.length - 1] ];
    };
    scale.copy = function() {
      return d3_scale_quantile(domain, range);
    };
    return rescale();
  }
  d3.scale.quantize = function() {
    return d3_scale_quantize(0, 1, [ 0, 1 ]);
  };
  function d3_scale_quantize(x0, x1, range) {
    var kx, i;
    function scale(x) {
      return range[Math.max(0, Math.min(i, Math.floor(kx * (x - x0))))];
    }
    function rescale() {
      kx = range.length / (x1 - x0);
      i = range.length - 1;
      return scale;
    }
    scale.domain = function(x) {
      if (!arguments.length) return [ x0, x1 ];
      x0 = +x[0];
      x1 = +x[x.length - 1];
      return rescale();
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      return rescale();
    };
    scale.invertExtent = function(y) {
      y = range.indexOf(y);
      y = y < 0 ? NaN : y / kx + x0;
      return [ y, y + 1 / kx ];
    };
    scale.copy = function() {
      return d3_scale_quantize(x0, x1, range);
    };
    return rescale();
  }
  d3.scale.threshold = function() {
    return d3_scale_threshold([ .5 ], [ 0, 1 ]);
  };
  function d3_scale_threshold(domain, range) {
    function scale(x) {
      if (x <= x) return range[d3.bisect(domain, x)];
    }
    scale.domain = function(_) {
      if (!arguments.length) return domain;
      domain = _;
      return scale;
    };
    scale.range = function(_) {
      if (!arguments.length) return range;
      range = _;
      return scale;
    };
    scale.invertExtent = function(y) {
      y = range.indexOf(y);
      return [ domain[y - 1], domain[y] ];
    };
    scale.copy = function() {
      return d3_scale_threshold(domain, range);
    };
    return scale;
  }
  d3.scale.identity = function() {
    return d3_scale_identity([ 0, 1 ]);
  };
  function d3_scale_identity(domain) {
    function identity(x) {
      return +x;
    }
    identity.invert = identity;
    identity.domain = identity.range = function(x) {
      if (!arguments.length) return domain;
      domain = x.map(identity);
      return identity;
    };
    identity.ticks = function(m) {
      return d3_scale_linearTicks(domain, m);
    };
    identity.tickFormat = function(m, format) {
      return d3_scale_linearTickFormat(domain, m, format);
    };
    identity.copy = function() {
      return d3_scale_identity(domain);
    };
    return identity;
  }
  d3.svg = {};
  function d3_zero() {
    return 0;
  }
  d3.svg.arc = function() {
    var innerRadius = d3_svg_arcInnerRadius, outerRadius = d3_svg_arcOuterRadius, cornerRadius = d3_zero, padRadius = d3_svg_arcAuto, startAngle = d3_svg_arcStartAngle, endAngle = d3_svg_arcEndAngle, padAngle = d3_svg_arcPadAngle;
    function arc() {
      var r0 = Math.max(0, +innerRadius.apply(this, arguments)), r1 = Math.max(0, +outerRadius.apply(this, arguments)), a0 = startAngle.apply(this, arguments) - halfπ, a1 = endAngle.apply(this, arguments) - halfπ, da = Math.abs(a1 - a0), cw = a0 > a1 ? 0 : 1;
      if (r1 < r0) rc = r1, r1 = r0, r0 = rc;
      if (da >= τε) return circleSegment(r1, cw) + (r0 ? circleSegment(r0, 1 - cw) : "") + "Z";
      var rc, cr, rp, ap, p0 = 0, p1 = 0, x0, y0, x1, y1, x2, y2, x3, y3, path = [];
      if (ap = (+padAngle.apply(this, arguments) || 0) / 2) {
        rp = padRadius === d3_svg_arcAuto ? Math.sqrt(r0 * r0 + r1 * r1) : +padRadius.apply(this, arguments);
        if (!cw) p1 *= -1;
        if (r1) p1 = d3_asin(rp / r1 * Math.sin(ap));
        if (r0) p0 = d3_asin(rp / r0 * Math.sin(ap));
      }
      if (r1) {
        x0 = r1 * Math.cos(a0 + p1);
        y0 = r1 * Math.sin(a0 + p1);
        x1 = r1 * Math.cos(a1 - p1);
        y1 = r1 * Math.sin(a1 - p1);
        var l1 = Math.abs(a1 - a0 - 2 * p1) <= π ? 0 : 1;
        if (p1 && d3_svg_arcSweep(x0, y0, x1, y1) === cw ^ l1) {
          var h1 = (a0 + a1) / 2;
          x0 = r1 * Math.cos(h1);
          y0 = r1 * Math.sin(h1);
          x1 = y1 = null;
        }
      } else {
        x0 = y0 = 0;
      }
      if (r0) {
        x2 = r0 * Math.cos(a1 - p0);
        y2 = r0 * Math.sin(a1 - p0);
        x3 = r0 * Math.cos(a0 + p0);
        y3 = r0 * Math.sin(a0 + p0);
        var l0 = Math.abs(a0 - a1 + 2 * p0) <= π ? 0 : 1;
        if (p0 && d3_svg_arcSweep(x2, y2, x3, y3) === 1 - cw ^ l0) {
          var h0 = (a0 + a1) / 2;
          x2 = r0 * Math.cos(h0);
          y2 = r0 * Math.sin(h0);
          x3 = y3 = null;
        }
      } else {
        x2 = y2 = 0;
      }
      if (da > ε && (rc = Math.min(Math.abs(r1 - r0) / 2, +cornerRadius.apply(this, arguments))) > .001) {
        cr = r0 < r1 ^ cw ? 0 : 1;
        var rc1 = rc, rc0 = rc;
        if (da < π) {
          var oc = x3 == null ? [ x2, y2 ] : x1 == null ? [ x0, y0 ] : d3_geom_polygonIntersect([ x0, y0 ], [ x3, y3 ], [ x1, y1 ], [ x2, y2 ]), ax = x0 - oc[0], ay = y0 - oc[1], bx = x1 - oc[0], by = y1 - oc[1], kc = 1 / Math.sin(Math.acos((ax * bx + ay * by) / (Math.sqrt(ax * ax + ay * ay) * Math.sqrt(bx * bx + by * by))) / 2), lc = Math.sqrt(oc[0] * oc[0] + oc[1] * oc[1]);
          rc0 = Math.min(rc, (r0 - lc) / (kc - 1));
          rc1 = Math.min(rc, (r1 - lc) / (kc + 1));
        }
        if (x1 != null) {
          var t30 = d3_svg_arcCornerTangents(x3 == null ? [ x2, y2 ] : [ x3, y3 ], [ x0, y0 ], r1, rc1, cw), t12 = d3_svg_arcCornerTangents([ x1, y1 ], [ x2, y2 ], r1, rc1, cw);
          if (rc === rc1) {
            path.push("M", t30[0], "A", rc1, ",", rc1, " 0 0,", cr, " ", t30[1], "A", r1, ",", r1, " 0 ", 1 - cw ^ d3_svg_arcSweep(t30[1][0], t30[1][1], t12[1][0], t12[1][1]), ",", cw, " ", t12[1], "A", rc1, ",", rc1, " 0 0,", cr, " ", t12[0]);
          } else {
            path.push("M", t30[0], "A", rc1, ",", rc1, " 0 1,", cr, " ", t12[0]);
          }
        } else {
          path.push("M", x0, ",", y0);
        }
        if (x3 != null) {
          var t03 = d3_svg_arcCornerTangents([ x0, y0 ], [ x3, y3 ], r0, -rc0, cw), t21 = d3_svg_arcCornerTangents([ x2, y2 ], x1 == null ? [ x0, y0 ] : [ x1, y1 ], r0, -rc0, cw);
          if (rc === rc0) {
            path.push("L", t21[0], "A", rc0, ",", rc0, " 0 0,", cr, " ", t21[1], "A", r0, ",", r0, " 0 ", cw ^ d3_svg_arcSweep(t21[1][0], t21[1][1], t03[1][0], t03[1][1]), ",", 1 - cw, " ", t03[1], "A", rc0, ",", rc0, " 0 0,", cr, " ", t03[0]);
          } else {
            path.push("L", t21[0], "A", rc0, ",", rc0, " 0 0,", cr, " ", t03[0]);
          }
        } else {
          path.push("L", x2, ",", y2);
        }
      } else {
        path.push("M", x0, ",", y0);
        if (x1 != null) path.push("A", r1, ",", r1, " 0 ", l1, ",", cw, " ", x1, ",", y1);
        path.push("L", x2, ",", y2);
        if (x3 != null) path.push("A", r0, ",", r0, " 0 ", l0, ",", 1 - cw, " ", x3, ",", y3);
      }
      path.push("Z");
      return path.join("");
    }
    function circleSegment(r1, cw) {
      return "M0," + r1 + "A" + r1 + "," + r1 + " 0 1," + cw + " 0," + -r1 + "A" + r1 + "," + r1 + " 0 1," + cw + " 0," + r1;
    }
    arc.innerRadius = function(v) {
      if (!arguments.length) return innerRadius;
      innerRadius = d3_functor(v);
      return arc;
    };
    arc.outerRadius = function(v) {
      if (!arguments.length) return outerRadius;
      outerRadius = d3_functor(v);
      return arc;
    };
    arc.cornerRadius = function(v) {
      if (!arguments.length) return cornerRadius;
      cornerRadius = d3_functor(v);
      return arc;
    };
    arc.padRadius = function(v) {
      if (!arguments.length) return padRadius;
      padRadius = v == d3_svg_arcAuto ? d3_svg_arcAuto : d3_functor(v);
      return arc;
    };
    arc.startAngle = function(v) {
      if (!arguments.length) return startAngle;
      startAngle = d3_functor(v);
      return arc;
    };
    arc.endAngle = function(v) {
      if (!arguments.length) return endAngle;
      endAngle = d3_functor(v);
      return arc;
    };
    arc.padAngle = function(v) {
      if (!arguments.length) return padAngle;
      padAngle = d3_functor(v);
      return arc;
    };
    arc.centroid = function() {
      var r = (+innerRadius.apply(this, arguments) + +outerRadius.apply(this, arguments)) / 2, a = (+startAngle.apply(this, arguments) + +endAngle.apply(this, arguments)) / 2 - halfπ;
      return [ Math.cos(a) * r, Math.sin(a) * r ];
    };
    return arc;
  };
  var d3_svg_arcAuto = "auto";
  function d3_svg_arcInnerRadius(d) {
    return d.innerRadius;
  }
  function d3_svg_arcOuterRadius(d) {
    return d.outerRadius;
  }
  function d3_svg_arcStartAngle(d) {
    return d.startAngle;
  }
  function d3_svg_arcEndAngle(d) {
    return d.endAngle;
  }
  function d3_svg_arcPadAngle(d) {
    return d && d.padAngle;
  }
  function d3_svg_arcSweep(x0, y0, x1, y1) {
    return (x0 - x1) * y0 - (y0 - y1) * x0 > 0 ? 0 : 1;
  }
  function d3_svg_arcCornerTangents(p0, p1, r1, rc, cw) {
    var x01 = p0[0] - p1[0], y01 = p0[1] - p1[1], lo = (cw ? rc : -rc) / Math.sqrt(x01 * x01 + y01 * y01), ox = lo * y01, oy = -lo * x01, x1 = p0[0] + ox, y1 = p0[1] + oy, x2 = p1[0] + ox, y2 = p1[1] + oy, x3 = (x1 + x2) / 2, y3 = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, d2 = dx * dx + dy * dy, r = r1 - rc, D = x1 * y2 - x2 * y1, d = (dy < 0 ? -1 : 1) * Math.sqrt(Math.max(0, r * r * d2 - D * D)), cx0 = (D * dy - dx * d) / d2, cy0 = (-D * dx - dy * d) / d2, cx1 = (D * dy + dx * d) / d2, cy1 = (-D * dx + dy * d) / d2, dx0 = cx0 - x3, dy0 = cy0 - y3, dx1 = cx1 - x3, dy1 = cy1 - y3;
    if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) cx0 = cx1, cy0 = cy1;
    return [ [ cx0 - ox, cy0 - oy ], [ cx0 * r1 / r, cy0 * r1 / r ] ];
  }
  function d3_svg_line(projection) {
    var x = d3_geom_pointX, y = d3_geom_pointY, defined = d3_true, interpolate = d3_svg_lineLinear, interpolateKey = interpolate.key, tension = .7;
    function line(data) {
      var segments = [], points = [], i = -1, n = data.length, d, fx = d3_functor(x), fy = d3_functor(y);
      function segment() {
        segments.push("M", interpolate(projection(points), tension));
      }
      while (++i < n) {
        if (defined.call(this, d = data[i], i)) {
          points.push([ +fx.call(this, d, i), +fy.call(this, d, i) ]);
        } else if (points.length) {
          segment();
          points = [];
        }
      }
      if (points.length) segment();
      return segments.length ? segments.join("") : null;
    }
    line.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      return line;
    };
    line.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      return line;
    };
    line.defined = function(_) {
      if (!arguments.length) return defined;
      defined = _;
      return line;
    };
    line.interpolate = function(_) {
      if (!arguments.length) return interpolateKey;
      if (typeof _ === "function") interpolateKey = interpolate = _; else interpolateKey = (interpolate = d3_svg_lineInterpolators.get(_) || d3_svg_lineLinear).key;
      return line;
    };
    line.tension = function(_) {
      if (!arguments.length) return tension;
      tension = _;
      return line;
    };
    return line;
  }
  d3.svg.line = function() {
    return d3_svg_line(d3_identity);
  };
  var d3_svg_lineInterpolators = d3.map({
    linear: d3_svg_lineLinear,
    "linear-closed": d3_svg_lineLinearClosed,
    step: d3_svg_lineStep,
    "step-before": d3_svg_lineStepBefore,
    "step-after": d3_svg_lineStepAfter,
    basis: d3_svg_lineBasis,
    "basis-open": d3_svg_lineBasisOpen,
    "basis-closed": d3_svg_lineBasisClosed,
    bundle: d3_svg_lineBundle,
    cardinal: d3_svg_lineCardinal,
    "cardinal-open": d3_svg_lineCardinalOpen,
    "cardinal-closed": d3_svg_lineCardinalClosed,
    monotone: d3_svg_lineMonotone
  });
  d3_svg_lineInterpolators.forEach(function(key, value) {
    value.key = key;
    value.closed = /-closed$/.test(key);
  });
  function d3_svg_lineLinear(points) {
    return points.length > 1 ? points.join("L") : points + "Z";
  }
  function d3_svg_lineLinearClosed(points) {
    return points.join("L") + "Z";
  }
  function d3_svg_lineStep(points) {
    var i = 0, n = points.length, p = points[0], path = [ p[0], ",", p[1] ];
    while (++i < n) path.push("H", (p[0] + (p = points[i])[0]) / 2, "V", p[1]);
    if (n > 1) path.push("H", p[0]);
    return path.join("");
  }
  function d3_svg_lineStepBefore(points) {
    var i = 0, n = points.length, p = points[0], path = [ p[0], ",", p[1] ];
    while (++i < n) path.push("V", (p = points[i])[1], "H", p[0]);
    return path.join("");
  }
  function d3_svg_lineStepAfter(points) {
    var i = 0, n = points.length, p = points[0], path = [ p[0], ",", p[1] ];
    while (++i < n) path.push("H", (p = points[i])[0], "V", p[1]);
    return path.join("");
  }
  function d3_svg_lineCardinalOpen(points, tension) {
    return points.length < 4 ? d3_svg_lineLinear(points) : points[1] + d3_svg_lineHermite(points.slice(1, -1), d3_svg_lineCardinalTangents(points, tension));
  }
  function d3_svg_lineCardinalClosed(points, tension) {
    return points.length < 3 ? d3_svg_lineLinearClosed(points) : points[0] + d3_svg_lineHermite((points.push(points[0]), 
    points), d3_svg_lineCardinalTangents([ points[points.length - 2] ].concat(points, [ points[1] ]), tension));
  }
  function d3_svg_lineCardinal(points, tension) {
    return points.length < 3 ? d3_svg_lineLinear(points) : points[0] + d3_svg_lineHermite(points, d3_svg_lineCardinalTangents(points, tension));
  }
  function d3_svg_lineHermite(points, tangents) {
    if (tangents.length < 1 || points.length != tangents.length && points.length != tangents.length + 2) {
      return d3_svg_lineLinear(points);
    }
    var quad = points.length != tangents.length, path = "", p0 = points[0], p = points[1], t0 = tangents[0], t = t0, pi = 1;
    if (quad) {
      path += "Q" + (p[0] - t0[0] * 2 / 3) + "," + (p[1] - t0[1] * 2 / 3) + "," + p[0] + "," + p[1];
      p0 = points[1];
      pi = 2;
    }
    if (tangents.length > 1) {
      t = tangents[1];
      p = points[pi];
      pi++;
      path += "C" + (p0[0] + t0[0]) + "," + (p0[1] + t0[1]) + "," + (p[0] - t[0]) + "," + (p[1] - t[1]) + "," + p[0] + "," + p[1];
      for (var i = 2; i < tangents.length; i++, pi++) {
        p = points[pi];
        t = tangents[i];
        path += "S" + (p[0] - t[0]) + "," + (p[1] - t[1]) + "," + p[0] + "," + p[1];
      }
    }
    if (quad) {
      var lp = points[pi];
      path += "Q" + (p[0] + t[0] * 2 / 3) + "," + (p[1] + t[1] * 2 / 3) + "," + lp[0] + "," + lp[1];
    }
    return path;
  }
  function d3_svg_lineCardinalTangents(points, tension) {
    var tangents = [], a = (1 - tension) / 2, p0, p1 = points[0], p2 = points[1], i = 1, n = points.length;
    while (++i < n) {
      p0 = p1;
      p1 = p2;
      p2 = points[i];
      tangents.push([ a * (p2[0] - p0[0]), a * (p2[1] - p0[1]) ]);
    }
    return tangents;
  }
  function d3_svg_lineBasis(points) {
    if (points.length < 3) return d3_svg_lineLinear(points);
    var i = 1, n = points.length, pi = points[0], x0 = pi[0], y0 = pi[1], px = [ x0, x0, x0, (pi = points[1])[0] ], py = [ y0, y0, y0, pi[1] ], path = [ x0, ",", y0, "L", d3_svg_lineDot4(d3_svg_lineBasisBezier3, px), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, py) ];
    points.push(points[n - 1]);
    while (++i <= n) {
      pi = points[i];
      px.shift();
      px.push(pi[0]);
      py.shift();
      py.push(pi[1]);
      d3_svg_lineBasisBezier(path, px, py);
    }
    points.pop();
    path.push("L", pi);
    return path.join("");
  }
  function d3_svg_lineBasisOpen(points) {
    if (points.length < 4) return d3_svg_lineLinear(points);
    var path = [], i = -1, n = points.length, pi, px = [ 0 ], py = [ 0 ];
    while (++i < 3) {
      pi = points[i];
      px.push(pi[0]);
      py.push(pi[1]);
    }
    path.push(d3_svg_lineDot4(d3_svg_lineBasisBezier3, px) + "," + d3_svg_lineDot4(d3_svg_lineBasisBezier3, py));
    --i;
    while (++i < n) {
      pi = points[i];
      px.shift();
      px.push(pi[0]);
      py.shift();
      py.push(pi[1]);
      d3_svg_lineBasisBezier(path, px, py);
    }
    return path.join("");
  }
  function d3_svg_lineBasisClosed(points) {
    var path, i = -1, n = points.length, m = n + 4, pi, px = [], py = [];
    while (++i < 4) {
      pi = points[i % n];
      px.push(pi[0]);
      py.push(pi[1]);
    }
    path = [ d3_svg_lineDot4(d3_svg_lineBasisBezier3, px), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, py) ];
    --i;
    while (++i < m) {
      pi = points[i % n];
      px.shift();
      px.push(pi[0]);
      py.shift();
      py.push(pi[1]);
      d3_svg_lineBasisBezier(path, px, py);
    }
    return path.join("");
  }
  function d3_svg_lineBundle(points, tension) {
    var n = points.length - 1;
    if (n) {
      var x0 = points[0][0], y0 = points[0][1], dx = points[n][0] - x0, dy = points[n][1] - y0, i = -1, p, t;
      while (++i <= n) {
        p = points[i];
        t = i / n;
        p[0] = tension * p[0] + (1 - tension) * (x0 + t * dx);
        p[1] = tension * p[1] + (1 - tension) * (y0 + t * dy);
      }
    }
    return d3_svg_lineBasis(points);
  }
  function d3_svg_lineDot4(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }
  var d3_svg_lineBasisBezier1 = [ 0, 2 / 3, 1 / 3, 0 ], d3_svg_lineBasisBezier2 = [ 0, 1 / 3, 2 / 3, 0 ], d3_svg_lineBasisBezier3 = [ 0, 1 / 6, 2 / 3, 1 / 6 ];
  function d3_svg_lineBasisBezier(path, x, y) {
    path.push("C", d3_svg_lineDot4(d3_svg_lineBasisBezier1, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier1, y), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier2, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier2, y), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, y));
  }
  function d3_svg_lineSlope(p0, p1) {
    return (p1[1] - p0[1]) / (p1[0] - p0[0]);
  }
  function d3_svg_lineFiniteDifferences(points) {
    var i = 0, j = points.length - 1, m = [], p0 = points[0], p1 = points[1], d = m[0] = d3_svg_lineSlope(p0, p1);
    while (++i < j) {
      m[i] = (d + (d = d3_svg_lineSlope(p0 = p1, p1 = points[i + 1]))) / 2;
    }
    m[i] = d;
    return m;
  }
  function d3_svg_lineMonotoneTangents(points) {
    var tangents = [], d, a, b, s, m = d3_svg_lineFiniteDifferences(points), i = -1, j = points.length - 1;
    while (++i < j) {
      d = d3_svg_lineSlope(points[i], points[i + 1]);
      if (abs(d) < ε) {
        m[i] = m[i + 1] = 0;
      } else {
        a = m[i] / d;
        b = m[i + 1] / d;
        s = a * a + b * b;
        if (s > 9) {
          s = d * 3 / Math.sqrt(s);
          m[i] = s * a;
          m[i + 1] = s * b;
        }
      }
    }
    i = -1;
    while (++i <= j) {
      s = (points[Math.min(j, i + 1)][0] - points[Math.max(0, i - 1)][0]) / (6 * (1 + m[i] * m[i]));
      tangents.push([ s || 0, m[i] * s || 0 ]);
    }
    return tangents;
  }
  function d3_svg_lineMonotone(points) {
    return points.length < 3 ? d3_svg_lineLinear(points) : points[0] + d3_svg_lineHermite(points, d3_svg_lineMonotoneTangents(points));
  }
  d3.svg.line.radial = function() {
    var line = d3_svg_line(d3_svg_lineRadial);
    line.radius = line.x, delete line.x;
    line.angle = line.y, delete line.y;
    return line;
  };
  function d3_svg_lineRadial(points) {
    var point, i = -1, n = points.length, r, a;
    while (++i < n) {
      point = points[i];
      r = point[0];
      a = point[1] - halfπ;
      point[0] = r * Math.cos(a);
      point[1] = r * Math.sin(a);
    }
    return points;
  }
  function d3_svg_area(projection) {
    var x0 = d3_geom_pointX, x1 = d3_geom_pointX, y0 = 0, y1 = d3_geom_pointY, defined = d3_true, interpolate = d3_svg_lineLinear, interpolateKey = interpolate.key, interpolateReverse = interpolate, L = "L", tension = .7;
    function area(data) {
      var segments = [], points0 = [], points1 = [], i = -1, n = data.length, d, fx0 = d3_functor(x0), fy0 = d3_functor(y0), fx1 = x0 === x1 ? function() {
        return x;
      } : d3_functor(x1), fy1 = y0 === y1 ? function() {
        return y;
      } : d3_functor(y1), x, y;
      function segment() {
        segments.push("M", interpolate(projection(points1), tension), L, interpolateReverse(projection(points0.reverse()), tension), "Z");
      }
      while (++i < n) {
        if (defined.call(this, d = data[i], i)) {
          points0.push([ x = +fx0.call(this, d, i), y = +fy0.call(this, d, i) ]);
          points1.push([ +fx1.call(this, d, i), +fy1.call(this, d, i) ]);
        } else if (points0.length) {
          segment();
          points0 = [];
          points1 = [];
        }
      }
      if (points0.length) segment();
      return segments.length ? segments.join("") : null;
    }
    area.x = function(_) {
      if (!arguments.length) return x1;
      x0 = x1 = _;
      return area;
    };
    area.x0 = function(_) {
      if (!arguments.length) return x0;
      x0 = _;
      return area;
    };
    area.x1 = function(_) {
      if (!arguments.length) return x1;
      x1 = _;
      return area;
    };
    area.y = function(_) {
      if (!arguments.length) return y1;
      y0 = y1 = _;
      return area;
    };
    area.y0 = function(_) {
      if (!arguments.length) return y0;
      y0 = _;
      return area;
    };
    area.y1 = function(_) {
      if (!arguments.length) return y1;
      y1 = _;
      return area;
    };
    area.defined = function(_) {
      if (!arguments.length) return defined;
      defined = _;
      return area;
    };
    area.interpolate = function(_) {
      if (!arguments.length) return interpolateKey;
      if (typeof _ === "function") interpolateKey = interpolate = _; else interpolateKey = (interpolate = d3_svg_lineInterpolators.get(_) || d3_svg_lineLinear).key;
      interpolateReverse = interpolate.reverse || interpolate;
      L = interpolate.closed ? "M" : "L";
      return area;
    };
    area.tension = function(_) {
      if (!arguments.length) return tension;
      tension = _;
      return area;
    };
    return area;
  }
  d3_svg_lineStepBefore.reverse = d3_svg_lineStepAfter;
  d3_svg_lineStepAfter.reverse = d3_svg_lineStepBefore;
  d3.svg.area = function() {
    return d3_svg_area(d3_identity);
  };
  d3.svg.area.radial = function() {
    var area = d3_svg_area(d3_svg_lineRadial);
    area.radius = area.x, delete area.x;
    area.innerRadius = area.x0, delete area.x0;
    area.outerRadius = area.x1, delete area.x1;
    area.angle = area.y, delete area.y;
    area.startAngle = area.y0, delete area.y0;
    area.endAngle = area.y1, delete area.y1;
    return area;
  };
  d3.svg.chord = function() {
    var source = d3_source, target = d3_target, radius = d3_svg_chordRadius, startAngle = d3_svg_arcStartAngle, endAngle = d3_svg_arcEndAngle;
    function chord(d, i) {
      var s = subgroup(this, source, d, i), t = subgroup(this, target, d, i);
      return "M" + s.p0 + arc(s.r, s.p1, s.a1 - s.a0) + (equals(s, t) ? curve(s.r, s.p1, s.r, s.p0) : curve(s.r, s.p1, t.r, t.p0) + arc(t.r, t.p1, t.a1 - t.a0) + curve(t.r, t.p1, s.r, s.p0)) + "Z";
    }
    function subgroup(self, f, d, i) {
      var subgroup = f.call(self, d, i), r = radius.call(self, subgroup, i), a0 = startAngle.call(self, subgroup, i) - halfπ, a1 = endAngle.call(self, subgroup, i) - halfπ;
      return {
        r: r,
        a0: a0,
        a1: a1,
        p0: [ r * Math.cos(a0), r * Math.sin(a0) ],
        p1: [ r * Math.cos(a1), r * Math.sin(a1) ]
      };
    }
    function equals(a, b) {
      return a.a0 == b.a0 && a.a1 == b.a1;
    }
    function arc(r, p, a) {
      return "A" + r + "," + r + " 0 " + +(a > π) + ",1 " + p;
    }
    function curve(r0, p0, r1, p1) {
      return "Q 0,0 " + p1;
    }
    chord.radius = function(v) {
      if (!arguments.length) return radius;
      radius = d3_functor(v);
      return chord;
    };
    chord.source = function(v) {
      if (!arguments.length) return source;
      source = d3_functor(v);
      return chord;
    };
    chord.target = function(v) {
      if (!arguments.length) return target;
      target = d3_functor(v);
      return chord;
    };
    chord.startAngle = function(v) {
      if (!arguments.length) return startAngle;
      startAngle = d3_functor(v);
      return chord;
    };
    chord.endAngle = function(v) {
      if (!arguments.length) return endAngle;
      endAngle = d3_functor(v);
      return chord;
    };
    return chord;
  };
  function d3_svg_chordRadius(d) {
    return d.radius;
  }
  d3.svg.diagonal = function() {
    var source = d3_source, target = d3_target, projection = d3_svg_diagonalProjection;
    function diagonal(d, i) {
      var p0 = source.call(this, d, i), p3 = target.call(this, d, i), m = (p0.y + p3.y) / 2, p = [ p0, {
        x: p0.x,
        y: m
      }, {
        x: p3.x,
        y: m
      }, p3 ];
      p = p.map(projection);
      return "M" + p[0] + "C" + p[1] + " " + p[2] + " " + p[3];
    }
    diagonal.source = function(x) {
      if (!arguments.length) return source;
      source = d3_functor(x);
      return diagonal;
    };
    diagonal.target = function(x) {
      if (!arguments.length) return target;
      target = d3_functor(x);
      return diagonal;
    };
    diagonal.projection = function(x) {
      if (!arguments.length) return projection;
      projection = x;
      return diagonal;
    };
    return diagonal;
  };
  function d3_svg_diagonalProjection(d) {
    return [ d.x, d.y ];
  }
  d3.svg.diagonal.radial = function() {
    var diagonal = d3.svg.diagonal(), projection = d3_svg_diagonalProjection, projection_ = diagonal.projection;
    diagonal.projection = function(x) {
      return arguments.length ? projection_(d3_svg_diagonalRadialProjection(projection = x)) : projection;
    };
    return diagonal;
  };
  function d3_svg_diagonalRadialProjection(projection) {
    return function() {
      var d = projection.apply(this, arguments), r = d[0], a = d[1] - halfπ;
      return [ r * Math.cos(a), r * Math.sin(a) ];
    };
  }
  d3.svg.symbol = function() {
    var type = d3_svg_symbolType, size = d3_svg_symbolSize;
    function symbol(d, i) {
      return (d3_svg_symbols.get(type.call(this, d, i)) || d3_svg_symbolCircle)(size.call(this, d, i));
    }
    symbol.type = function(x) {
      if (!arguments.length) return type;
      type = d3_functor(x);
      return symbol;
    };
    symbol.size = function(x) {
      if (!arguments.length) return size;
      size = d3_functor(x);
      return symbol;
    };
    return symbol;
  };
  function d3_svg_symbolSize() {
    return 64;
  }
  function d3_svg_symbolType() {
    return "circle";
  }
  function d3_svg_symbolCircle(size) {
    var r = Math.sqrt(size / π);
    return "M0," + r + "A" + r + "," + r + " 0 1,1 0," + -r + "A" + r + "," + r + " 0 1,1 0," + r + "Z";
  }
  var d3_svg_symbols = d3.map({
    circle: d3_svg_symbolCircle,
    cross: function(size) {
      var r = Math.sqrt(size / 5) / 2;
      return "M" + -3 * r + "," + -r + "H" + -r + "V" + -3 * r + "H" + r + "V" + -r + "H" + 3 * r + "V" + r + "H" + r + "V" + 3 * r + "H" + -r + "V" + r + "H" + -3 * r + "Z";
    },
    diamond: function(size) {
      var ry = Math.sqrt(size / (2 * d3_svg_symbolTan30)), rx = ry * d3_svg_symbolTan30;
      return "M0," + -ry + "L" + rx + ",0" + " 0," + ry + " " + -rx + ",0" + "Z";
    },
    square: function(size) {
      var r = Math.sqrt(size) / 2;
      return "M" + -r + "," + -r + "L" + r + "," + -r + " " + r + "," + r + " " + -r + "," + r + "Z";
    },
    "triangle-down": function(size) {
      var rx = Math.sqrt(size / d3_svg_symbolSqrt3), ry = rx * d3_svg_symbolSqrt3 / 2;
      return "M0," + ry + "L" + rx + "," + -ry + " " + -rx + "," + -ry + "Z";
    },
    "triangle-up": function(size) {
      var rx = Math.sqrt(size / d3_svg_symbolSqrt3), ry = rx * d3_svg_symbolSqrt3 / 2;
      return "M0," + -ry + "L" + rx + "," + ry + " " + -rx + "," + ry + "Z";
    }
  });
  d3.svg.symbolTypes = d3_svg_symbols.keys();
  var d3_svg_symbolSqrt3 = Math.sqrt(3), d3_svg_symbolTan30 = Math.tan(30 * d3_radians);
  d3_selectionPrototype.transition = function(name) {
    var id = d3_transitionInheritId || ++d3_transitionId, ns = d3_transitionNamespace(name), subgroups = [], subgroup, node, transition = d3_transitionInherit || {
      time: Date.now(),
      ease: d3_ease_cubicInOut,
      delay: 0,
      duration: 250
    };
    for (var j = -1, m = this.length; ++j < m; ) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) d3_transitionNode(node, i, ns, id, transition);
        subgroup.push(node);
      }
    }
    return d3_transition(subgroups, ns, id);
  };
  d3_selectionPrototype.interrupt = function(name) {
    return this.each(name == null ? d3_selection_interrupt : d3_selection_interruptNS(d3_transitionNamespace(name)));
  };
  var d3_selection_interrupt = d3_selection_interruptNS(d3_transitionNamespace());
  function d3_selection_interruptNS(ns) {
    return function() {
      var lock, activeId, active;
      if ((lock = this[ns]) && (active = lock[activeId = lock.active])) {
        active.timer.c = null;
        active.timer.t = NaN;
        if (--lock.count) delete lock[activeId]; else delete this[ns];
        lock.active += .5;
        active.event && active.event.interrupt.call(this, this.__data__, active.index);
      }
    };
  }
  function d3_transition(groups, ns, id) {
    d3_subclass(groups, d3_transitionPrototype);
    groups.namespace = ns;
    groups.id = id;
    return groups;
  }
  var d3_transitionPrototype = [], d3_transitionId = 0, d3_transitionInheritId, d3_transitionInherit;
  d3_transitionPrototype.call = d3_selectionPrototype.call;
  d3_transitionPrototype.empty = d3_selectionPrototype.empty;
  d3_transitionPrototype.node = d3_selectionPrototype.node;
  d3_transitionPrototype.size = d3_selectionPrototype.size;
  d3.transition = function(selection, name) {
    return selection && selection.transition ? d3_transitionInheritId ? selection.transition(name) : selection : d3.selection().transition(selection);
  };
  d3.transition.prototype = d3_transitionPrototype;
  d3_transitionPrototype.select = function(selector) {
    var id = this.id, ns = this.namespace, subgroups = [], subgroup, subnode, node;
    selector = d3_selection_selector(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if ((node = group[i]) && (subnode = selector.call(node, node.__data__, i, j))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          d3_transitionNode(subnode, i, ns, id, node[ns][id]);
          subgroup.push(subnode);
        } else {
          subgroup.push(null);
        }
      }
    }
    return d3_transition(subgroups, ns, id);
  };
  d3_transitionPrototype.selectAll = function(selector) {
    var id = this.id, ns = this.namespace, subgroups = [], subgroup, subnodes, node, subnode, transition;
    selector = d3_selection_selectorAll(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          transition = node[ns][id];
          subnodes = selector.call(node, node.__data__, i, j);
          subgroups.push(subgroup = []);
          for (var k = -1, o = subnodes.length; ++k < o; ) {
            if (subnode = subnodes[k]) d3_transitionNode(subnode, k, ns, id, transition);
            subgroup.push(subnode);
          }
        }
      }
    }
    return d3_transition(subgroups, ns, id);
  };
  d3_transitionPrototype.filter = function(filter) {
    var subgroups = [], subgroup, group, node;
    if (typeof filter !== "function") filter = d3_selection_filter(filter);
    for (var j = 0, m = this.length; j < m; j++) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = 0, n = group.length; i < n; i++) {
        if ((node = group[i]) && filter.call(node, node.__data__, i, j)) {
          subgroup.push(node);
        }
      }
    }
    return d3_transition(subgroups, this.namespace, this.id);
  };
  d3_transitionPrototype.tween = function(name, tween) {
    var id = this.id, ns = this.namespace;
    if (arguments.length < 2) return this.node()[ns][id].tween.get(name);
    return d3_selection_each(this, tween == null ? function(node) {
      node[ns][id].tween.remove(name);
    } : function(node) {
      node[ns][id].tween.set(name, tween);
    });
  };
  function d3_transition_tween(groups, name, value, tween) {
    var id = groups.id, ns = groups.namespace;
    return d3_selection_each(groups, typeof value === "function" ? function(node, i, j) {
      node[ns][id].tween.set(name, tween(value.call(node, node.__data__, i, j)));
    } : (value = tween(value), function(node) {
      node[ns][id].tween.set(name, value);
    }));
  }
  d3_transitionPrototype.attr = function(nameNS, value) {
    if (arguments.length < 2) {
      for (value in nameNS) this.attr(value, nameNS[value]);
      return this;
    }
    var interpolate = nameNS == "transform" ? d3_interpolateTransform : d3_interpolate, name = d3.ns.qualify(nameNS);
    function attrNull() {
      this.removeAttribute(name);
    }
    function attrNullNS() {
      this.removeAttributeNS(name.space, name.local);
    }
    function attrTween(b) {
      return b == null ? attrNull : (b += "", function() {
        var a = this.getAttribute(name), i;
        return a !== b && (i = interpolate(a, b), function(t) {
          this.setAttribute(name, i(t));
        });
      });
    }
    function attrTweenNS(b) {
      return b == null ? attrNullNS : (b += "", function() {
        var a = this.getAttributeNS(name.space, name.local), i;
        return a !== b && (i = interpolate(a, b), function(t) {
          this.setAttributeNS(name.space, name.local, i(t));
        });
      });
    }
    return d3_transition_tween(this, "attr." + nameNS, value, name.local ? attrTweenNS : attrTween);
  };
  d3_transitionPrototype.attrTween = function(nameNS, tween) {
    var name = d3.ns.qualify(nameNS);
    function attrTween(d, i) {
      var f = tween.call(this, d, i, this.getAttribute(name));
      return f && function(t) {
        this.setAttribute(name, f(t));
      };
    }
    function attrTweenNS(d, i) {
      var f = tween.call(this, d, i, this.getAttributeNS(name.space, name.local));
      return f && function(t) {
        this.setAttributeNS(name.space, name.local, f(t));
      };
    }
    return this.tween("attr." + nameNS, name.local ? attrTweenNS : attrTween);
  };
  d3_transitionPrototype.style = function(name, value, priority) {
    var n = arguments.length;
    if (n < 3) {
      if (typeof name !== "string") {
        if (n < 2) value = "";
        for (priority in name) this.style(priority, name[priority], value);
        return this;
      }
      priority = "";
    }
    function styleNull() {
      this.style.removeProperty(name);
    }
    function styleString(b) {
      return b == null ? styleNull : (b += "", function() {
        var a = d3_window(this).getComputedStyle(this, null).getPropertyValue(name), i;
        return a !== b && (i = d3_interpolate(a, b), function(t) {
          this.style.setProperty(name, i(t), priority);
        });
      });
    }
    return d3_transition_tween(this, "style." + name, value, styleString);
  };
  d3_transitionPrototype.styleTween = function(name, tween, priority) {
    if (arguments.length < 3) priority = "";
    function styleTween(d, i) {
      var f = tween.call(this, d, i, d3_window(this).getComputedStyle(this, null).getPropertyValue(name));
      return f && function(t) {
        this.style.setProperty(name, f(t), priority);
      };
    }
    return this.tween("style." + name, styleTween);
  };
  d3_transitionPrototype.text = function(value) {
    return d3_transition_tween(this, "text", value, d3_transition_text);
  };
  function d3_transition_text(b) {
    if (b == null) b = "";
    return function() {
      this.textContent = b;
    };
  }
  d3_transitionPrototype.remove = function() {
    var ns = this.namespace;
    return this.each("end.transition", function() {
      var p;
      if (this[ns].count < 2 && (p = this.parentNode)) p.removeChild(this);
    });
  };
  d3_transitionPrototype.ease = function(value) {
    var id = this.id, ns = this.namespace;
    if (arguments.length < 1) return this.node()[ns][id].ease;
    if (typeof value !== "function") value = d3.ease.apply(d3, arguments);
    return d3_selection_each(this, function(node) {
      node[ns][id].ease = value;
    });
  };
  d3_transitionPrototype.delay = function(value) {
    var id = this.id, ns = this.namespace;
    if (arguments.length < 1) return this.node()[ns][id].delay;
    return d3_selection_each(this, typeof value === "function" ? function(node, i, j) {
      node[ns][id].delay = +value.call(node, node.__data__, i, j);
    } : (value = +value, function(node) {
      node[ns][id].delay = value;
    }));
  };
  d3_transitionPrototype.duration = function(value) {
    var id = this.id, ns = this.namespace;
    if (arguments.length < 1) return this.node()[ns][id].duration;
    return d3_selection_each(this, typeof value === "function" ? function(node, i, j) {
      node[ns][id].duration = Math.max(1, value.call(node, node.__data__, i, j));
    } : (value = Math.max(1, value), function(node) {
      node[ns][id].duration = value;
    }));
  };
  d3_transitionPrototype.each = function(type, listener) {
    var id = this.id, ns = this.namespace;
    if (arguments.length < 2) {
      var inherit = d3_transitionInherit, inheritId = d3_transitionInheritId;
      try {
        d3_transitionInheritId = id;
        d3_selection_each(this, function(node, i, j) {
          d3_transitionInherit = node[ns][id];
          type.call(node, node.__data__, i, j);
        });
      } finally {
        d3_transitionInherit = inherit;
        d3_transitionInheritId = inheritId;
      }
    } else {
      d3_selection_each(this, function(node) {
        var transition = node[ns][id];
        (transition.event || (transition.event = d3.dispatch("start", "end", "interrupt"))).on(type, listener);
      });
    }
    return this;
  };
  d3_transitionPrototype.transition = function() {
    var id0 = this.id, id1 = ++d3_transitionId, ns = this.namespace, subgroups = [], subgroup, group, node, transition;
    for (var j = 0, m = this.length; j < m; j++) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = 0, n = group.length; i < n; i++) {
        if (node = group[i]) {
          transition = node[ns][id0];
          d3_transitionNode(node, i, ns, id1, {
            time: transition.time,
            ease: transition.ease,
            delay: transition.delay + transition.duration,
            duration: transition.duration
          });
        }
        subgroup.push(node);
      }
    }
    return d3_transition(subgroups, ns, id1);
  };
  function d3_transitionNamespace(name) {
    return name == null ? "__transition__" : "__transition_" + name + "__";
  }
  function d3_transitionNode(node, i, ns, id, inherit) {
    var lock = node[ns] || (node[ns] = {
      active: 0,
      count: 0
    }), transition = lock[id], time, timer, duration, ease, tweens;
    function schedule(elapsed) {
      var delay = transition.delay;
      timer.t = delay + time;
      if (delay <= elapsed) return start(elapsed - delay);
      timer.c = start;
    }
    function start(elapsed) {
      var activeId = lock.active, active = lock[activeId];
      if (active) {
        active.timer.c = null;
        active.timer.t = NaN;
        --lock.count;
        delete lock[activeId];
        active.event && active.event.interrupt.call(node, node.__data__, active.index);
      }
      for (var cancelId in lock) {
        if (+cancelId < id) {
          var cancel = lock[cancelId];
          cancel.timer.c = null;
          cancel.timer.t = NaN;
          --lock.count;
          delete lock[cancelId];
        }
      }
      timer.c = tick;
      d3_timer(function() {
        if (timer.c && tick(elapsed || 1)) {
          timer.c = null;
          timer.t = NaN;
        }
        return 1;
      }, 0, time);
      lock.active = id;
      transition.event && transition.event.start.call(node, node.__data__, i);
      tweens = [];
      transition.tween.forEach(function(key, value) {
        if (value = value.call(node, node.__data__, i)) {
          tweens.push(value);
        }
      });
      ease = transition.ease;
      duration = transition.duration;
    }
    function tick(elapsed) {
      var t = elapsed / duration, e = ease(t), n = tweens.length;
      while (n > 0) {
        tweens[--n].call(node, e);
      }
      if (t >= 1) {
        transition.event && transition.event.end.call(node, node.__data__, i);
        if (--lock.count) delete lock[id]; else delete node[ns];
        return 1;
      }
    }
    if (!transition) {
      time = inherit.time;
      timer = d3_timer(schedule, 0, time);
      transition = lock[id] = {
        tween: new d3_Map(),
        time: time,
        timer: timer,
        delay: inherit.delay,
        duration: inherit.duration,
        ease: inherit.ease,
        index: i
      };
      inherit = null;
      ++lock.count;
    }
  }
  d3.svg.axis = function() {
    var scale = d3.scale.linear(), orient = d3_svg_axisDefaultOrient, innerTickSize = 6, outerTickSize = 6, tickPadding = 3, tickArguments_ = [ 10 ], tickValues = null, tickFormat_;
    function axis(g) {
      g.each(function() {
        var g = d3.select(this);
        var scale0 = this.__chart__ || scale, scale1 = this.__chart__ = scale.copy();
        var ticks = tickValues == null ? scale1.ticks ? scale1.ticks.apply(scale1, tickArguments_) : scale1.domain() : tickValues, tickFormat = tickFormat_ == null ? scale1.tickFormat ? scale1.tickFormat.apply(scale1, tickArguments_) : d3_identity : tickFormat_, tick = g.selectAll(".tick").data(ticks, scale1), tickEnter = tick.enter().insert("g", ".domain").attr("class", "tick").style("opacity", ε), tickExit = d3.transition(tick.exit()).style("opacity", ε).remove(), tickUpdate = d3.transition(tick.order()).style("opacity", 1), tickSpacing = Math.max(innerTickSize, 0) + tickPadding, tickTransform;
        var range = d3_scaleRange(scale1), path = g.selectAll(".domain").data([ 0 ]), pathUpdate = (path.enter().append("path").attr("class", "domain"), 
        d3.transition(path));
        tickEnter.append("line");
        tickEnter.append("text");
        var lineEnter = tickEnter.select("line"), lineUpdate = tickUpdate.select("line"), text = tick.select("text").text(tickFormat), textEnter = tickEnter.select("text"), textUpdate = tickUpdate.select("text"), sign = orient === "top" || orient === "left" ? -1 : 1, x1, x2, y1, y2;
        if (orient === "bottom" || orient === "top") {
          tickTransform = d3_svg_axisX, x1 = "x", y1 = "y", x2 = "x2", y2 = "y2";
          text.attr("dy", sign < 0 ? "0em" : ".71em").style("text-anchor", "middle");
          pathUpdate.attr("d", "M" + range[0] + "," + sign * outerTickSize + "V0H" + range[1] + "V" + sign * outerTickSize);
        } else {
          tickTransform = d3_svg_axisY, x1 = "y", y1 = "x", x2 = "y2", y2 = "x2";
          text.attr("dy", ".32em").style("text-anchor", sign < 0 ? "end" : "start");
          pathUpdate.attr("d", "M" + sign * outerTickSize + "," + range[0] + "H0V" + range[1] + "H" + sign * outerTickSize);
        }
        lineEnter.attr(y2, sign * innerTickSize);
        textEnter.attr(y1, sign * tickSpacing);
        lineUpdate.attr(x2, 0).attr(y2, sign * innerTickSize);
        textUpdate.attr(x1, 0).attr(y1, sign * tickSpacing);
        if (scale1.rangeBand) {
          var x = scale1, dx = x.rangeBand() / 2;
          scale0 = scale1 = function(d) {
            return x(d) + dx;
          };
        } else if (scale0.rangeBand) {
          scale0 = scale1;
        } else {
          tickExit.call(tickTransform, scale1, scale0);
        }
        tickEnter.call(tickTransform, scale0, scale1);
        tickUpdate.call(tickTransform, scale1, scale1);
      });
    }
    axis.scale = function(x) {
      if (!arguments.length) return scale;
      scale = x;
      return axis;
    };
    axis.orient = function(x) {
      if (!arguments.length) return orient;
      orient = x in d3_svg_axisOrients ? x + "" : d3_svg_axisDefaultOrient;
      return axis;
    };
    axis.ticks = function() {
      if (!arguments.length) return tickArguments_;
      tickArguments_ = d3_array(arguments);
      return axis;
    };
    axis.tickValues = function(x) {
      if (!arguments.length) return tickValues;
      tickValues = x;
      return axis;
    };
    axis.tickFormat = function(x) {
      if (!arguments.length) return tickFormat_;
      tickFormat_ = x;
      return axis;
    };
    axis.tickSize = function(x) {
      var n = arguments.length;
      if (!n) return innerTickSize;
      innerTickSize = +x;
      outerTickSize = +arguments[n - 1];
      return axis;
    };
    axis.innerTickSize = function(x) {
      if (!arguments.length) return innerTickSize;
      innerTickSize = +x;
      return axis;
    };
    axis.outerTickSize = function(x) {
      if (!arguments.length) return outerTickSize;
      outerTickSize = +x;
      return axis;
    };
    axis.tickPadding = function(x) {
      if (!arguments.length) return tickPadding;
      tickPadding = +x;
      return axis;
    };
    axis.tickSubdivide = function() {
      return arguments.length && axis;
    };
    return axis;
  };
  var d3_svg_axisDefaultOrient = "bottom", d3_svg_axisOrients = {
    top: 1,
    right: 1,
    bottom: 1,
    left: 1
  };
  function d3_svg_axisX(selection, x0, x1) {
    selection.attr("transform", function(d) {
      var v0 = x0(d);
      return "translate(" + (isFinite(v0) ? v0 : x1(d)) + ",0)";
    });
  }
  function d3_svg_axisY(selection, y0, y1) {
    selection.attr("transform", function(d) {
      var v0 = y0(d);
      return "translate(0," + (isFinite(v0) ? v0 : y1(d)) + ")";
    });
  }
  d3.svg.brush = function() {
    var event = d3_eventDispatch(brush, "brushstart", "brush", "brushend"), x = null, y = null, xExtent = [ 0, 0 ], yExtent = [ 0, 0 ], xExtentDomain, yExtentDomain, xClamp = true, yClamp = true, resizes = d3_svg_brushResizes[0];
    function brush(g) {
      g.each(function() {
        var g = d3.select(this).style("pointer-events", "all").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)").on("mousedown.brush", brushstart).on("touchstart.brush", brushstart);
        var background = g.selectAll(".background").data([ 0 ]);
        background.enter().append("rect").attr("class", "background").style("visibility", "hidden").style("cursor", "crosshair");
        g.selectAll(".extent").data([ 0 ]).enter().append("rect").attr("class", "extent").style("cursor", "move");
        var resize = g.selectAll(".resize").data(resizes, d3_identity);
        resize.exit().remove();
        resize.enter().append("g").attr("class", function(d) {
          return "resize " + d;
        }).style("cursor", function(d) {
          return d3_svg_brushCursor[d];
        }).append("rect").attr("x", function(d) {
          return /[ew]$/.test(d) ? -3 : null;
        }).attr("y", function(d) {
          return /^[ns]/.test(d) ? -3 : null;
        }).attr("width", 6).attr("height", 6).style("visibility", "hidden");
        resize.style("display", brush.empty() ? "none" : null);
        var gUpdate = d3.transition(g), backgroundUpdate = d3.transition(background), range;
        if (x) {
          range = d3_scaleRange(x);
          backgroundUpdate.attr("x", range[0]).attr("width", range[1] - range[0]);
          redrawX(gUpdate);
        }
        if (y) {
          range = d3_scaleRange(y);
          backgroundUpdate.attr("y", range[0]).attr("height", range[1] - range[0]);
          redrawY(gUpdate);
        }
        redraw(gUpdate);
      });
    }
    brush.event = function(g) {
      g.each(function() {
        var event_ = event.of(this, arguments), extent1 = {
          x: xExtent,
          y: yExtent,
          i: xExtentDomain,
          j: yExtentDomain
        }, extent0 = this.__chart__ || extent1;
        this.__chart__ = extent1;
        if (d3_transitionInheritId) {
          d3.select(this).transition().each("start.brush", function() {
            xExtentDomain = extent0.i;
            yExtentDomain = extent0.j;
            xExtent = extent0.x;
            yExtent = extent0.y;
            event_({
              type: "brushstart"
            });
          }).tween("brush:brush", function() {
            var xi = d3_interpolateArray(xExtent, extent1.x), yi = d3_interpolateArray(yExtent, extent1.y);
            xExtentDomain = yExtentDomain = null;
            return function(t) {
              xExtent = extent1.x = xi(t);
              yExtent = extent1.y = yi(t);
              event_({
                type: "brush",
                mode: "resize"
              });
            };
          }).each("end.brush", function() {
            xExtentDomain = extent1.i;
            yExtentDomain = extent1.j;
            event_({
              type: "brush",
              mode: "resize"
            });
            event_({
              type: "brushend"
            });
          });
        } else {
          event_({
            type: "brushstart"
          });
          event_({
            type: "brush",
            mode: "resize"
          });
          event_({
            type: "brushend"
          });
        }
      });
    };
    function redraw(g) {
      g.selectAll(".resize").attr("transform", function(d) {
        return "translate(" + xExtent[+/e$/.test(d)] + "," + yExtent[+/^s/.test(d)] + ")";
      });
    }
    function redrawX(g) {
      g.select(".extent").attr("x", xExtent[0]);
      g.selectAll(".extent,.n>rect,.s>rect").attr("width", xExtent[1] - xExtent[0]);
    }
    function redrawY(g) {
      g.select(".extent").attr("y", yExtent[0]);
      g.selectAll(".extent,.e>rect,.w>rect").attr("height", yExtent[1] - yExtent[0]);
    }
    function brushstart() {
      var target = this, eventTarget = d3.select(d3.event.target), event_ = event.of(target, arguments), g = d3.select(target), resizing = eventTarget.datum(), resizingX = !/^(n|s)$/.test(resizing) && x, resizingY = !/^(e|w)$/.test(resizing) && y, dragging = eventTarget.classed("extent"), dragRestore = d3_event_dragSuppress(target), center, origin = d3.mouse(target), offset;
      var w = d3.select(d3_window(target)).on("keydown.brush", keydown).on("keyup.brush", keyup);
      if (d3.event.changedTouches) {
        w.on("touchmove.brush", brushmove).on("touchend.brush", brushend);
      } else {
        w.on("mousemove.brush", brushmove).on("mouseup.brush", brushend);
      }
      g.interrupt().selectAll("*").interrupt();
      if (dragging) {
        origin[0] = xExtent[0] - origin[0];
        origin[1] = yExtent[0] - origin[1];
      } else if (resizing) {
        var ex = +/w$/.test(resizing), ey = +/^n/.test(resizing);
        offset = [ xExtent[1 - ex] - origin[0], yExtent[1 - ey] - origin[1] ];
        origin[0] = xExtent[ex];
        origin[1] = yExtent[ey];
      } else if (d3.event.altKey) center = origin.slice();
      g.style("pointer-events", "none").selectAll(".resize").style("display", null);
      d3.select("body").style("cursor", eventTarget.style("cursor"));
      event_({
        type: "brushstart"
      });
      brushmove();
      function keydown() {
        if (d3.event.keyCode == 32) {
          if (!dragging) {
            center = null;
            origin[0] -= xExtent[1];
            origin[1] -= yExtent[1];
            dragging = 2;
          }
          d3_eventPreventDefault();
        }
      }
      function keyup() {
        if (d3.event.keyCode == 32 && dragging == 2) {
          origin[0] += xExtent[1];
          origin[1] += yExtent[1];
          dragging = 0;
          d3_eventPreventDefault();
        }
      }
      function brushmove() {
        var point = d3.mouse(target), moved = false;
        if (offset) {
          point[0] += offset[0];
          point[1] += offset[1];
        }
        if (!dragging) {
          if (d3.event.altKey) {
            if (!center) center = [ (xExtent[0] + xExtent[1]) / 2, (yExtent[0] + yExtent[1]) / 2 ];
            origin[0] = xExtent[+(point[0] < center[0])];
            origin[1] = yExtent[+(point[1] < center[1])];
          } else center = null;
        }
        if (resizingX && move1(point, x, 0)) {
          redrawX(g);
          moved = true;
        }
        if (resizingY && move1(point, y, 1)) {
          redrawY(g);
          moved = true;
        }
        if (moved) {
          redraw(g);
          event_({
            type: "brush",
            mode: dragging ? "move" : "resize"
          });
        }
      }
      function move1(point, scale, i) {
        var range = d3_scaleRange(scale), r0 = range[0], r1 = range[1], position = origin[i], extent = i ? yExtent : xExtent, size = extent[1] - extent[0], min, max;
        if (dragging) {
          r0 -= position;
          r1 -= size + position;
        }
        min = (i ? yClamp : xClamp) ? Math.max(r0, Math.min(r1, point[i])) : point[i];
        if (dragging) {
          max = (min += position) + size;
        } else {
          if (center) position = Math.max(r0, Math.min(r1, 2 * center[i] - min));
          if (position < min) {
            max = min;
            min = position;
          } else {
            max = position;
          }
        }
        if (extent[0] != min || extent[1] != max) {
          if (i) yExtentDomain = null; else xExtentDomain = null;
          extent[0] = min;
          extent[1] = max;
          return true;
        }
      }
      function brushend() {
        brushmove();
        g.style("pointer-events", "all").selectAll(".resize").style("display", brush.empty() ? "none" : null);
        d3.select("body").style("cursor", null);
        w.on("mousemove.brush", null).on("mouseup.brush", null).on("touchmove.brush", null).on("touchend.brush", null).on("keydown.brush", null).on("keyup.brush", null);
        dragRestore();
        event_({
          type: "brushend"
        });
      }
    }
    brush.x = function(z) {
      if (!arguments.length) return x;
      x = z;
      resizes = d3_svg_brushResizes[!x << 1 | !y];
      return brush;
    };
    brush.y = function(z) {
      if (!arguments.length) return y;
      y = z;
      resizes = d3_svg_brushResizes[!x << 1 | !y];
      return brush;
    };
    brush.clamp = function(z) {
      if (!arguments.length) return x && y ? [ xClamp, yClamp ] : x ? xClamp : y ? yClamp : null;
      if (x && y) xClamp = !!z[0], yClamp = !!z[1]; else if (x) xClamp = !!z; else if (y) yClamp = !!z;
      return brush;
    };
    brush.extent = function(z) {
      var x0, x1, y0, y1, t;
      if (!arguments.length) {
        if (x) {
          if (xExtentDomain) {
            x0 = xExtentDomain[0], x1 = xExtentDomain[1];
          } else {
            x0 = xExtent[0], x1 = xExtent[1];
            if (x.invert) x0 = x.invert(x0), x1 = x.invert(x1);
            if (x1 < x0) t = x0, x0 = x1, x1 = t;
          }
        }
        if (y) {
          if (yExtentDomain) {
            y0 = yExtentDomain[0], y1 = yExtentDomain[1];
          } else {
            y0 = yExtent[0], y1 = yExtent[1];
            if (y.invert) y0 = y.invert(y0), y1 = y.invert(y1);
            if (y1 < y0) t = y0, y0 = y1, y1 = t;
          }
        }
        return x && y ? [ [ x0, y0 ], [ x1, y1 ] ] : x ? [ x0, x1 ] : y && [ y0, y1 ];
      }
      if (x) {
        x0 = z[0], x1 = z[1];
        if (y) x0 = x0[0], x1 = x1[0];
        xExtentDomain = [ x0, x1 ];
        if (x.invert) x0 = x(x0), x1 = x(x1);
        if (x1 < x0) t = x0, x0 = x1, x1 = t;
        if (x0 != xExtent[0] || x1 != xExtent[1]) xExtent = [ x0, x1 ];
      }
      if (y) {
        y0 = z[0], y1 = z[1];
        if (x) y0 = y0[1], y1 = y1[1];
        yExtentDomain = [ y0, y1 ];
        if (y.invert) y0 = y(y0), y1 = y(y1);
        if (y1 < y0) t = y0, y0 = y1, y1 = t;
        if (y0 != yExtent[0] || y1 != yExtent[1]) yExtent = [ y0, y1 ];
      }
      return brush;
    };
    brush.clear = function() {
      if (!brush.empty()) {
        xExtent = [ 0, 0 ], yExtent = [ 0, 0 ];
        xExtentDomain = yExtentDomain = null;
      }
      return brush;
    };
    brush.empty = function() {
      return !!x && xExtent[0] == xExtent[1] || !!y && yExtent[0] == yExtent[1];
    };
    return d3.rebind(brush, event, "on");
  };
  var d3_svg_brushCursor = {
    n: "ns-resize",
    e: "ew-resize",
    s: "ns-resize",
    w: "ew-resize",
    nw: "nwse-resize",
    ne: "nesw-resize",
    se: "nwse-resize",
    sw: "nesw-resize"
  };
  var d3_svg_brushResizes = [ [ "n", "e", "s", "w", "nw", "ne", "se", "sw" ], [ "e", "w" ], [ "n", "s" ], [] ];
  var d3_time_format = d3_time.format = d3_locale_enUS.timeFormat;
  var d3_time_formatUtc = d3_time_format.utc;
  var d3_time_formatIso = d3_time_formatUtc("%Y-%m-%dT%H:%M:%S.%LZ");
  d3_time_format.iso = Date.prototype.toISOString && +new Date("2000-01-01T00:00:00.000Z") ? d3_time_formatIsoNative : d3_time_formatIso;
  function d3_time_formatIsoNative(date) {
    return date.toISOString();
  }
  d3_time_formatIsoNative.parse = function(string) {
    var date = new Date(string);
    return isNaN(date) ? null : date;
  };
  d3_time_formatIsoNative.toString = d3_time_formatIso.toString;
  d3_time.second = d3_time_interval(function(date) {
    return new d3_date(Math.floor(date / 1e3) * 1e3);
  }, function(date, offset) {
    date.setTime(date.getTime() + Math.floor(offset) * 1e3);
  }, function(date) {
    return date.getSeconds();
  });
  d3_time.seconds = d3_time.second.range;
  d3_time.seconds.utc = d3_time.second.utc.range;
  d3_time.minute = d3_time_interval(function(date) {
    return new d3_date(Math.floor(date / 6e4) * 6e4);
  }, function(date, offset) {
    date.setTime(date.getTime() + Math.floor(offset) * 6e4);
  }, function(date) {
    return date.getMinutes();
  });
  d3_time.minutes = d3_time.minute.range;
  d3_time.minutes.utc = d3_time.minute.utc.range;
  d3_time.hour = d3_time_interval(function(date) {
    var timezone = date.getTimezoneOffset() / 60;
    return new d3_date((Math.floor(date / 36e5 - timezone) + timezone) * 36e5);
  }, function(date, offset) {
    date.setTime(date.getTime() + Math.floor(offset) * 36e5);
  }, function(date) {
    return date.getHours();
  });
  d3_time.hours = d3_time.hour.range;
  d3_time.hours.utc = d3_time.hour.utc.range;
  d3_time.month = d3_time_interval(function(date) {
    date = d3_time.day(date);
    date.setDate(1);
    return date;
  }, function(date, offset) {
    date.setMonth(date.getMonth() + offset);
  }, function(date) {
    return date.getMonth();
  });
  d3_time.months = d3_time.month.range;
  d3_time.months.utc = d3_time.month.utc.range;
  function d3_time_scale(linear, methods, format) {
    function scale(x) {
      return linear(x);
    }
    scale.invert = function(x) {
      return d3_time_scaleDate(linear.invert(x));
    };
    scale.domain = function(x) {
      if (!arguments.length) return linear.domain().map(d3_time_scaleDate);
      linear.domain(x);
      return scale;
    };
    function tickMethod(extent, count) {
      var span = extent[1] - extent[0], target = span / count, i = d3.bisect(d3_time_scaleSteps, target);
      return i == d3_time_scaleSteps.length ? [ methods.year, d3_scale_linearTickRange(extent.map(function(d) {
        return d / 31536e6;
      }), count)[2] ] : !i ? [ d3_time_scaleMilliseconds, d3_scale_linearTickRange(extent, count)[2] ] : methods[target / d3_time_scaleSteps[i - 1] < d3_time_scaleSteps[i] / target ? i - 1 : i];
    }
    scale.nice = function(interval, skip) {
      var domain = scale.domain(), extent = d3_scaleExtent(domain), method = interval == null ? tickMethod(extent, 10) : typeof interval === "number" && tickMethod(extent, interval);
      if (method) interval = method[0], skip = method[1];
      function skipped(date) {
        return !isNaN(date) && !interval.range(date, d3_time_scaleDate(+date + 1), skip).length;
      }
      return scale.domain(d3_scale_nice(domain, skip > 1 ? {
        floor: function(date) {
          while (skipped(date = interval.floor(date))) date = d3_time_scaleDate(date - 1);
          return date;
        },
        ceil: function(date) {
          while (skipped(date = interval.ceil(date))) date = d3_time_scaleDate(+date + 1);
          return date;
        }
      } : interval));
    };
    scale.ticks = function(interval, skip) {
      var extent = d3_scaleExtent(scale.domain()), method = interval == null ? tickMethod(extent, 10) : typeof interval === "number" ? tickMethod(extent, interval) : !interval.range && [ {
        range: interval
      }, skip ];
      if (method) interval = method[0], skip = method[1];
      return interval.range(extent[0], d3_time_scaleDate(+extent[1] + 1), skip < 1 ? 1 : skip);
    };
    scale.tickFormat = function() {
      return format;
    };
    scale.copy = function() {
      return d3_time_scale(linear.copy(), methods, format);
    };
    return d3_scale_linearRebind(scale, linear);
  }
  function d3_time_scaleDate(t) {
    return new Date(t);
  }
  var d3_time_scaleSteps = [ 1e3, 5e3, 15e3, 3e4, 6e4, 3e5, 9e5, 18e5, 36e5, 108e5, 216e5, 432e5, 864e5, 1728e5, 6048e5, 2592e6, 7776e6, 31536e6 ];
  var d3_time_scaleLocalMethods = [ [ d3_time.second, 1 ], [ d3_time.second, 5 ], [ d3_time.second, 15 ], [ d3_time.second, 30 ], [ d3_time.minute, 1 ], [ d3_time.minute, 5 ], [ d3_time.minute, 15 ], [ d3_time.minute, 30 ], [ d3_time.hour, 1 ], [ d3_time.hour, 3 ], [ d3_time.hour, 6 ], [ d3_time.hour, 12 ], [ d3_time.day, 1 ], [ d3_time.day, 2 ], [ d3_time.week, 1 ], [ d3_time.month, 1 ], [ d3_time.month, 3 ], [ d3_time.year, 1 ] ];
  var d3_time_scaleLocalFormat = d3_time_format.multi([ [ ".%L", function(d) {
    return d.getMilliseconds();
  } ], [ ":%S", function(d) {
    return d.getSeconds();
  } ], [ "%I:%M", function(d) {
    return d.getMinutes();
  } ], [ "%I %p", function(d) {
    return d.getHours();
  } ], [ "%a %d", function(d) {
    return d.getDay() && d.getDate() != 1;
  } ], [ "%b %d", function(d) {
    return d.getDate() != 1;
  } ], [ "%B", function(d) {
    return d.getMonth();
  } ], [ "%Y", d3_true ] ]);
  var d3_time_scaleMilliseconds = {
    range: function(start, stop, step) {
      return d3.range(Math.ceil(start / step) * step, +stop, step).map(d3_time_scaleDate);
    },
    floor: d3_identity,
    ceil: d3_identity
  };
  d3_time_scaleLocalMethods.year = d3_time.year;
  d3_time.scale = function() {
    return d3_time_scale(d3.scale.linear(), d3_time_scaleLocalMethods, d3_time_scaleLocalFormat);
  };
  var d3_time_scaleUtcMethods = d3_time_scaleLocalMethods.map(function(m) {
    return [ m[0].utc, m[1] ];
  });
  var d3_time_scaleUtcFormat = d3_time_formatUtc.multi([ [ ".%L", function(d) {
    return d.getUTCMilliseconds();
  } ], [ ":%S", function(d) {
    return d.getUTCSeconds();
  } ], [ "%I:%M", function(d) {
    return d.getUTCMinutes();
  } ], [ "%I %p", function(d) {
    return d.getUTCHours();
  } ], [ "%a %d", function(d) {
    return d.getUTCDay() && d.getUTCDate() != 1;
  } ], [ "%b %d", function(d) {
    return d.getUTCDate() != 1;
  } ], [ "%B", function(d) {
    return d.getUTCMonth();
  } ], [ "%Y", d3_true ] ]);
  d3_time_scaleUtcMethods.year = d3_time.year.utc;
  d3_time.scale.utc = function() {
    return d3_time_scale(d3.scale.linear(), d3_time_scaleUtcMethods, d3_time_scaleUtcFormat);
  };
  d3.text = d3_xhrType(function(request) {
    return request.responseText;
  });
  d3.json = function(url, callback) {
    return d3_xhr(url, "application/json", d3_json, callback);
  };
  function d3_json(request) {
    return JSON.parse(request.responseText);
  }
  d3.html = function(url, callback) {
    return d3_xhr(url, "text/html", d3_html, callback);
  };
  function d3_html(request) {
    var range = d3_document.createRange();
    range.selectNode(d3_document.body);
    return range.createContextualFragment(request.responseText);
  }
  d3.xml = d3_xhrType(function(request) {
    return request.responseXML;
  });
  if (typeof define === "function" && define.amd) this.d3 = d3, define(d3); else if (typeof module === "object" && module.exports) module.exports = d3; else this.d3 = d3;
}();
},{}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],7:[function(require,module,exports){
var isFunction = require('is-function')

module.exports = forEach

var toString = Object.prototype.toString
var hasOwnProperty = Object.prototype.hasOwnProperty

function forEach(list, iterator, context) {
    if (!isFunction(iterator)) {
        throw new TypeError('iterator must be a function')
    }

    if (arguments.length < 3) {
        context = this
    }
    
    if (toString.call(list) === '[object Array]')
        forEachArray(list, iterator, context)
    else if (typeof list === 'string')
        forEachString(list, iterator, context)
    else
        forEachObject(list, iterator, context)
}

function forEachArray(array, iterator, context) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            iterator.call(context, array[i], i, array)
        }
    }
}

function forEachString(string, iterator, context) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        iterator.call(context, string.charAt(i), i, string)
    }
}

function forEachObject(object, iterator, context) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            iterator.call(context, object[k], k, object)
        }
    }
}

},{"is-function":11}],8:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(require,module,exports){
var request = require('request')

if (typeof Promise !== 'function') {
  throw new TypeError('Please provide a Promise polyfill as your environment doesn\'t support them natively')
}

module.exports = function (options, callback) {

  return new Promise(function (resolve, reject) {

    request(options, function (err, response, body) {

      var status = (response) ? response.statusCode : 0
      callback = callback || function () {}

      if (err) {
        callback(err)
        reject(err)
        return
      }

      try{
        response.body = JSON.parse(body)
      }
      catch (e) {}

      if (status >= 400 && status < 600) {
        callback(null, response, response.body)
        reject(response)
        return
      }

      callback(null, response, response.body)
      resolve(response)
    })
  })
}

},{"request":10}],10:[function(require,module,exports){
var request = require('xhr');

// Wrapper to make the features more similiar between
// request and xhr

module.exports = function (options, callback) {
  callback = callback || function () {};
  
  // Set up for Request module
  if (options.data && !window) options.form = options.data;
  
  // Set up for xhr module
  if (options.form && window) {
    options.body = (typeof options.form === 'object')
      ? JSON.stringify(options.form)
      : options.form;
  }
  
  if (options.data) {
    options.body = (typeof options.data === 'object')
      ? JSON.stringify(options.data)
      : options.data;
  }
  
  if (options.url && window) options.uri = options.url;
  if (window) options.cors = options.withCredentials;
  
  return request(options, callback);
};
},{"xhr":114}],11:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],12:[function(require,module,exports){
module.exports = once

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var called = false
  return function () {
    if (called) return
    called = true
    return fn.apply(this, arguments)
  }
}

},{}],13:[function(require,module,exports){
var trim = require('trim')
  , forEach = require('for-each')
  , isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    }

module.exports = function (headers) {
  if (!headers)
    return {}

  var result = {}

  forEach(
      trim(headers).split('\n')
    , function (row) {
        var index = row.indexOf(':')
          , key = trim(row.slice(0, index)).toLowerCase()
          , value = trim(row.slice(index + 1))

        if (typeof(result[key]) === 'undefined') {
          result[key] = value
        } else if (isArray(result[key])) {
          result[key].push(value)
        } else {
          result[key] = [ result[key], value ]
        }
      }
  )

  return result
}
},{"for-each":7,"trim":112}],14:[function(require,module,exports){
'use strict';

var React = require('react');

module.exports = React.createClass({

  displayName: 'Area',

  propTypes: {
    path: React.PropTypes.string,
    fill: React.PropTypes.string
  },

  getDefaultProps:function() {
    return {
      fill: '#3182bd'
    };
  },

  render:function() {

    return (
      React.createElement("path", {
        className: "rd3-areachart-area", 
        d: this.props.path, 
        fill: this.props.fill, 
        onMouseOver: this.props.handleMouseOver, 
        onMouseLeave: this.props.handleMouseLeave}
      )
    );
  }

});

},{"react":undefined}],15:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var DataSeries = require('./DataSeries');
var $__0=      require('../common'),Chart=$__0.Chart,XAxis=$__0.XAxis,YAxis=$__0.YAxis;
var $__1=     require('../mixins'),CartesianChartPropsMixin=$__1.CartesianChartPropsMixin,ViewBoxMixin=$__1.ViewBoxMixin;

module.exports = React.createClass({

  mixins: [ CartesianChartPropsMixin, ViewBoxMixin ],

  displayName: 'AreaChart',

  propTypes: {
    margins:           React.PropTypes.object,
    interpolate:       React.PropTypes.bool,
    interpolationType: React.PropTypes.string,
    hoverAnimation:    React.PropTypes.bool,
 },

  getDefaultProps:function() {
    return {
      margins: {top: 10, right: 20, bottom: 40, left: 45},
      yAxisTickCount: 4,
      interpolate: false,
      interpolationType: null,
      className: 'rd3-areachart',
      hoverAnimation: true
    };
  },

  render:function() {

    var props = this.props;

    var data = props.data;

    var interpolationType = props.interpolationType || (props.interpolate ? 'cardinal' : 'linear');

    // Calculate inner chart dimensions
    var innerWidth, innerHeight;
    innerWidth = this.getOuterDimensions().width - props.margins.left - props.margins.right;
    innerHeight = this.getOuterDimensions().height - props.margins.top - props.margins.bottom;

    if (!Array.isArray(data)) {
      data = [data];
    }

    var yScale = d3.scale.linear()
      .range([innerHeight, 0]);

    var xValues = [];
    var yValues = [];
    var seriesNames = [];
    var yMaxValues = [];
    data.forEach( function(series)  {
      var upper = 0;
      seriesNames.push(series.name);
      series.values.forEach(function(val, idx)  {
        upper = Math.max(upper, props.yAccessor(val));
        xValues.push(props.xAccessor(val));
        yValues.push(props.yAccessor(val));
      });
      yMaxValues.push(upper);
    });

    var xScale;
    if (xValues.length > 0 && Object.prototype.toString.call(xValues[0]) === '[object Date]' && props.xAxisTickInterval) {
      xScale = d3.time.scale()
        .range([0, innerWidth]);
    } else {
      xScale = d3.scale.linear()
        .range([0, innerWidth]);
    }

    xScale.domain(d3.extent(xValues));
    yScale.domain([0, d3.sum(yMaxValues)]);

    props.colors.domain(seriesNames);

    var stack = d3.layout.stack()
      .x(props.xAccessor)
      .y(props.yAccessor)
      .values(function(d) { return d.values; });

    var layers = stack(data);

    var trans = ("translate(" +  props.margins.left + "," +  props.margins.top + ")");

    var dataSeries = layers.map( function(d, idx)  {
      return (
          React.createElement(DataSeries, {
            key: idx, 
            seriesName: d.name, 
            fill: props.colors(props.colorAccessor(d, idx)), 
            index: idx, 
            xScale: xScale, 
            yScale: yScale, 
            data: d.values, 
            xAccessor: props.xAccessor, 
            yAccessor: props.yAccessor, 
            interpolationType: interpolationType, 
            hoverAnimation: props.hoverAnimation}
          )
        );
      });

    return (
      React.createElement(Chart, {
        viewBox: this.getViewBox(), 
        legend: props.legend, 
        data: data, 
        margins: props.margins, 
        colors: props.colors, 
        colorAccessor: props.colorAccessor, 
        width: props.width, 
        height: props.height, 
        title: props.title
      }, 
        React.createElement("g", {transform: trans, className: props.className}, 
          React.createElement(XAxis, {
            xAxisClassName: "rd3-areachart-xaxis", 
            xScale: xScale, 
            xAxisTickValues: props.xAxisTickValues, 
            xAxisTickInterval: props.xAxisTickInterval, 
            xAxisTickCount: props.xAxisTickCount, 
            xAxisLabel: props.xAxisLabel, 
            xAxisLabelOffset: props.xAxisLabelOffset, 
            tickFormatting: props.xAxisFormatter, 
            xOrient: props.xOrient, 
            yOrient: props.yOrient, 
            margins: props.margins, 
            width: innerWidth, 
            height: innerHeight, 
            gridVertical: props.gridVertical, 
            gridVerticalStroke: props.gridVerticalStroke, 
            gridVerticalStrokeWidth: props.gridVerticalStrokeWidth, 
            gridVerticalStrokeDash: props.gridVerticalStrokeDash}
          ), 
          React.createElement(YAxis, {
            yAxisClassName: "rd3-areachart-yaxis", 
            yScale: yScale, 
            yAxisTickValues: props.yAxisTickValues, 
            yAxisTickInterval: props.yAxisTickInterval, 
            yAxisTickCount: props.yAxisTickCount, 
            yAxisLabel: props.yAxisLabel, 
            yAxisLabelOffset: props.yAxisLabelOffset, 
            tickFormatting: props.yAxisFormatter, 
            xOrient: props.xOrient, 
            yOrient: props.yOrient, 
            margins: props.margins, 
            width: innerWidth, 
            height: props.height, 
            gridHorizontal: props.gridHorizontal, 
            gridHorizontalStroke: props.gridHorizontalStroke, 
            gridHorizontalStrokeWidth: props.gridHorizontalStrokeWidth, 
            gridHorizontalStrokeDash: props.gridHorizontalStrokeDash}
          ), 
          dataSeries
        )
      )
    );
  }

});

},{"../common":42,"../mixins":52,"./DataSeries":17,"d3":5,"react":undefined}],16:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var shade = require('../utils').shade;
var Area = require('./Area');

module.exports = React.createClass({

  displayName: 'AreaContainer',

  propTypes: {
    fill: React.PropTypes.string, 
  },

  getDefaultProps:function() {
    return {
      fill: '#3182bd'
    };
  },

  getInitialState:function() {
    return { 
      fill: this.props.fill
    };
  },

  render:function() {

    var props = this.props;

    // animation controller
    var handleMouseOver, handleMouseLeave;
    if(props.hoverAnimation) {
      handleMouseOver = this._animateArea;
      handleMouseLeave = this._restoreArea;
    } else {
      handleMouseOver = handleMouseLeave = null;
    }

    return (
      React.createElement(Area, React.__spread({
          handleMouseOver: handleMouseOver, 
          handleMouseLeave: handleMouseLeave}, 
          props, 
          {fill: this.state.fill})
      )
    );
  },

  _animateArea:function() {
    this.setState({ 
      fill: shade(this.props.fill, 0.02)
    });
  },

  _restoreArea:function() {
    this.setState({ 
      fill: this.props.fill
    });
  },

});

},{"../utils":68,"./Area":14,"d3":5,"react":undefined}],17:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var AreaContainer = require('./AreaContainer');

module.exports = React.createClass({

  displayName: 'DataSeries',

  propTypes: {
    fill:              React.PropTypes.string,
    interpolationType: React.PropTypes.string
  },

  getDefaultProps:function() {
    return {
      interpolationType: 'linear'
    };
  },

  render:function() {

    var props = this.props;

    var area = d3.svg.area()
      .x(function(d) { return props.xScale(props.xAccessor(d)); })
      .y0(function(d) { return props.yScale(d.y0); })
      .y1(function(d) { return props.yScale(d.y0 + props.yAccessor(d)); })
      .interpolate(props.interpolationType);

    var path = area(props.data);

    return (
      React.createElement(AreaContainer, {
        fill: props.fill, 
        hoverAnimation: props.hoverAnimation, 
        path: path}
      )
    );
  }

});

},{"./AreaContainer":16,"d3":5,"react":undefined}],18:[function(require,module,exports){

exports.AreaChart = require('./AreaChart');

},{"./AreaChart":15}],19:[function(require,module,exports){
'use strict';

var React = require('react');

module.exports = React.createClass({displayName: "exports",

  propTypes: {
    fill: React.PropTypes.string,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
    x: React.PropTypes.number,
    y: React.PropTypes.number,
    className: React.PropTypes.string
  },

  getDefaultProps:function() {
    return {
      offset: 0,
      className: 'rd3-barchart-bar'
    };
  },

  render:function() {
    return (
      React.createElement("rect", React.__spread({
        className: "rd3-barchart-bar"}, 
        this.props, 
        {fill: this.props.fill, 
        onMouseOver: this.props.handleMouseOver, 
        onMouseLeave: this.props.handleMouseLeave})
      )
    );
  }
});

},{"react":undefined}],20:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var DataSeries = require('./DataSeries');
var utils = require('../utils');

var $__0=      require('../common'),Chart=$__0.Chart,XAxis=$__0.XAxis,YAxis=$__0.YAxis;
var $__1=     require('../mixins'),CartesianChartPropsMixin=$__1.CartesianChartPropsMixin,ViewBoxMixin=$__1.ViewBoxMixin;

module.exports = React.createClass({

  mixins: [ CartesianChartPropsMixin, ViewBoxMixin ],

  displayName: 'BarChart',

  propTypes: {
    chartClassName:         React.PropTypes.string,
    data:                   React.PropTypes.array.isRequired,
    hoverAnimation:         React.PropTypes.bool,
    height:                 React.PropTypes.number,
    margins:                React.PropTypes.object,
    rangeRoundBandsPadding: React.PropTypes.number,
    // https://github.com/mbostock/d3/wiki/Stack-Layout#offset
    stackOffset:            React.PropTypes.oneOf(['silhouette', 'expand', 'wigget', 'zero']),
    valuesAccessor:         React.PropTypes.func,
    title:                  React.PropTypes.string,
    width:                  React.PropTypes.number,
    xAxisClassName:         React.PropTypes.string,
    yAxisClassName:         React.PropTypes.string,
    yAxisTickCount:         React.PropTypes.number,
  },

  getDefaultProps:function() {
    return {
      chartClassName:         'rd3-barchart',
      hoverAnimation:         true,
      margins:                {top: 10, right: 20, bottom: 40, left: 45},
      rangeRoundBandsPadding: 0.25,
      stackOffset:            'zero',
      valuesAccessor:         function(d)  {return d.values;},
      xAxisClassName:         'rd3-barchart-xaxis',
      yAxisClassName:         'rd3-barchart-yaxis',
      yAxisTickCount:         4,
    };
  },

  _getStackedValuesMaxY:function(_data) {
    // in stacked bar chart, the maximum height we need for 
    // yScale domain is the sum of y0 + y
    var $__0=    this.props,valuesAccessor=$__0.valuesAccessor;
    return d3.max(_data, function(d) {
      return d3.max(valuesAccessor(d), function(d) {
        // where y0, y is generated by d3.layout.stack()
        return d.y0 + d.y;
      });
    });
  },

  _getLabels:function(firstSeries) {
    // we only need first series to get all the labels
    var $__0=     this.props,valuesAccessor=$__0.valuesAccessor,xAccessor=$__0.xAccessor;
    return valuesAccessor(firstSeries).map(xAccessor);
  },

  _stack:function() {
    var $__0=       this.props,stackOffset=$__0.stackOffset,xAccessor=$__0.xAccessor,yAccessor=$__0.yAccessor,valuesAccessor=$__0.valuesAccessor;
    return d3.layout.stack()
                    .offset(stackOffset)
                    .x(xAccessor)
                    .y(yAccessor)
                    .values(valuesAccessor);
  },

  render:function() {

    var props = this.props;

    var _data = this._stack()(props.data);

    var margins = props.margins;

    var innerHeight = props.height - ( margins.top + margins.bottom );
    var innerWidth = props.width - ( margins.left + margins.right );

    var xScale = d3.scale.ordinal()
      .domain(this._getLabels(_data[0]))
      .rangeRoundBands([0, innerWidth], props.rangeRoundBandsPadding);

    var yScale = d3.scale.linear()
      .range([innerHeight, 0])
      .domain([0, this._getStackedValuesMaxY(_data)]);

    var trans = ("translate(" +  margins.left + "," +  margins.top + ")");

    return (
      React.createElement(Chart, {
        viewBox: props.viewBox, 
        legend: props.legend, 
        data: props.data, 
        margins: props.margins, 
        colors: props.colors, 
        colorAccessor: props.colorAccessor, 
        width: props.width, 
        height: props.height, 
        title: props.title
      }, 
        React.createElement("g", {transform: trans, className: props.chartClassName}, 
          React.createElement(YAxis, {
            yAxisClassName: props.yAxisClassName, 
            yAxisTickValues: props.yAxisTickValues, 
            yAxisLabel: props.yAxisLabel, 
            yAxisLabelOffset: props.yAxisLabelOffset, 
            yScale: yScale, 
            margins: margins, 
            yAxisTickCount: props.yAxisTickCount, 
            tickFormatting: props.yAxisFormatter, 
            width: innerWidth, 
            height: innerHeight, 
            xOrient: props.xOrient, 
            yOrient: props.yOrient, 
            gridHorizontal: props.gridHorizontal, 
            gridHorizontalStroke: props.gridHorizontalStroke, 
            gridHorizontalStrokeWidth: props.gridHorizontalStrokeWidth, 
            gridHorizontalStrokeDash: props.gridHorizontalStrokeDash}
          ), 
          React.createElement(XAxis, {
            xAxisClassName: props.xAxisClassName, 
            xAxisTickValues: props.xAxisTickValues, 
            xAxisLabel: props.xAxisLabel, 
            xAxisLabelOffset: props.xAxisLabelOffset, 
            xScale: xScale, 
            margins: margins, 
            tickFormatting: props.xAxisFormatter, 
            width: innerWidth, 
            height: innerHeight, 
            xOrient: props.xOrient, 
            yOrient: props.yOrient, 
            gridVertical: props.gridVertical, 
            gridVerticalStroke: props.gridVerticalStroke, 
            gridVerticalStrokeWidth: props.gridVerticalStrokeWidth, 
            gridVerticalStrokeDash: props.gridVerticalStrokeDash}
          ), 
          React.createElement(DataSeries, {
            yScale: yScale, 
            xScale: xScale, 
            margins: margins, 
            _data: _data, 
            width: innerWidth, 
            height: innerHeight, 
            colors: props.colors, 
            colorAccessor: props.colorAccessor, 
            hoverAnimation: props.hoverAnimation, 
            valuesAccessor: props.valuesAccessor}
            )
        )
      )
    );
  }

});

},{"../common":42,"../mixins":52,"../utils":68,"./DataSeries":22,"d3":5,"react":undefined}],21:[function(require,module,exports){
'use strict';

var React = require('react');
var Bar = require('./Bar');
var shade = require('../utils').shade;

module.exports = React.createClass({displayName: "exports",

  propTypes: {
    fill: React.PropTypes.string,
  },

  getDefaultProps:function() {
    return {
      fill: '#3182BD'
    };
  },

  getInitialState:function() {
    return {
      // fill is named as fill instead of initialFill to avoid
      // confusion when passing down props from top parent
      fill: this.props.fill
    };
  },

  render:function() {

    var props = this.props;

    return (
      React.createElement(Bar, React.__spread({}, 
        props, 
        {fill: this.state.fill, 
        handleMouseOver: props.hoverAnimation ? this._animateBar : null, 
        handleMouseLeave: props.hoverAnimation ? this._restoreBar : null})
      )
    );
  },

  _animateBar:function() {
    this.setState({ 
      fill: shade(this.props.fill, 0.2)
    });
  },

  _restoreBar:function() {
    this.setState({ 
      fill: this.props.fill
    });
  },
});

},{"../utils":68,"./Bar":19,"react":undefined}],22:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var BarContainer = require('./BarContainer');

module.exports = React.createClass({

  displayName: 'DataSeries',

  propTypes: {
    _data:          React.PropTypes.array,
    colors:         React.PropTypes.func,
    colorAccessor:  React.PropTypes.func,
    height:         React.PropTypes.number,
    width:          React.PropTypes.number,
    valuesAccessor: React.PropTypes.func,
  },

  render:function() {
    return (
      React.createElement("g", null, this._renderBarSeries())
    );
  },

  _renderBarSeries:function() {
    var $__0=     this.props,_data=$__0._data,valuesAccessor=$__0.valuesAccessor;
    return _data.map(function(layer, seriesIdx)  {
      return valuesAccessor(layer)
             .map(function(segment)  {return this._renderBarContainer(segment, seriesIdx);}.bind(this))
    }.bind(this));
  },

  _renderBarContainer:function(segment, seriesIdx) {
    var $__0=         this.props,colors=$__0.colors,colorAccessor=$__0.colorAccessor,height=$__0.height,hoverAnimation=$__0.hoverAnimation,xScale=$__0.xScale,yScale=$__0.yScale;
    return (
      React.createElement(BarContainer, {
        height: height - yScale(segment.y), 
        width: xScale.rangeBand(), 
        x: xScale(segment.x), 
        y: yScale( segment.y0 + segment.y), 
        fill: colors(colorAccessor(segment, seriesIdx)), 
        hoverAnimation: hoverAnimation}
      )
    )
  }

});

},{"./BarContainer":21,"d3":5,"react":undefined}],23:[function(require,module,exports){

exports.BarChart = require('./BarChart');

},{"./BarChart":20}],24:[function(require,module,exports){
'use strict';

var React = require('react');

module.exports = React.createClass({

  displayName: 'Candle',

  propTypes: {
    className:      React.PropTypes.string,
    shapeRendering: React.PropTypes.string,
    stroke:         React.PropTypes.string,
    strokeWidth:    React.PropTypes.number,
  },

  getDefaultProps:function() {
    return {
      className:      'rd3-candlestick-candle',
      shapeRendering: 'crispEdges',
      stroke:         '#000',
      strokeWidth:    1,
    };
  },

  render:function() {
    var props = this.props;

    return (
      React.createElement("rect", {
        className: props.className, 
        fill: props.candleFill, 
        x: props.candle_x, 
        y: props.candle_y, 
        stroke: props.stroke, 
        strokeWidth: props.strokeWidth, 
        style: { shapeRendering: props.shapeRendering}, 
        width: props.candleWidth, 
        height: props.candleHeight, 
        onMouseOver: props.handleMouseOver, 
        onMouseLeave: props.handleMouseLeave}
      )
    );
  }

});

},{"react":undefined}],25:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var utils = require('../utils');
var DataSeries = require('./DataSeries');
var $__0=      require('../common'),Chart=$__0.Chart,XAxis=$__0.XAxis,YAxis=$__0.YAxis;

module.exports = React.createClass({

  displayName: 'CandleStickChart',

  propTypes: {
    data:              React.PropTypes.oneOfType([
                         React.PropTypes.array,
                         React.PropTypes.object
                       ]),
    fillUp:            React.PropTypes.func,
    fillUpAccessor:    React.PropTypes.func,
    fillDown:          React.PropTypes.func,
    fillDownAccessor:  React.PropTypes.func,
    height:            React.PropTypes.number,
    hoverAnimation:    React.PropTypes.bool,
    title:             React.PropTypes.string,
    xAccessor:         React.PropTypes.func,
    xAxisFormatter:    React.PropTypes.func,
    xAxisTickInterval: React.PropTypes.object,
    xAxisTickValues:   React.PropTypes.array,
    yAccessor:         React.PropTypes.func,
    yAxisFormatter:    React.PropTypes.func,
    yAxisTickCount:    React.PropTypes.number,
    yAxisTickValues:   React.PropTypes.array,
    width:             React.PropTypes.number,
  },

  getDefaultProps:function() {
    return {
      className:        'rd3-candlestick',
      xAxisClassName:   'rd3-candlestick-xaxis',
      yAxisClassName:   'rd3-candlestick-yaxis',
      data:             [],
      fillUp:           function(value)  {return '#ffffff';},
      fillUpAccessor:   function(d, idx)  {return idx;},
      fillDown:         d3.scale.category20c(),
      fillDownAccessor: function(d, idx)  {return idx;},
      height:           200,
      hoverAnimation:   true,
      margins:          {top: 10, right: 20, bottom: 30, left: 45},
      legendOffset:     120,
      title:            '',
      xAccessor:        function(d)  {return d.x;},
      yAccessor:        function(d)  {return { open: d.open, high: d.high, low: d.low, close: d.close };},
      width:            400,
    };
  },

  render:function() {

    var props = this.props;

    // Calculate inner chart dimensions
    var innerWidth, innerHeight;
    innerWidth = props.width - props.margins.left - props.margins.right;
    innerHeight = props.height - props.margins.top - props.margins.bottom;

    if (!Array.isArray(props.data)) {
      props.data = [props.data];
    }
    var flattenedData = utils.flattenData(props.data, props.xAccessor, props.yAccessor);

    var allValues = flattenedData.allValues,
        xValues = flattenedData.xValues,
        yValues = flattenedData.yValues;
    var scales = utils.calculateScales(innerWidth, innerHeight, xValues, yValues);

    var trans = ("translate(" + ( props.yAxisOffset < 0 ? props.margins.left + Math.abs(props.yAxisOffset) : props.margins.left) + "," +  props.margins.top + ")");

    var dataSeries = props.data.map( function(series, idx)  {
      return (
          React.createElement(DataSeries, {
            key: idx, 
            seriesName: series.name, 
            index: idx, 
            xScale: scales.xScale, 
            yScale: scales.yScale, 
            data: series.values, 
            fillUp: props.fillUp(props.fillUpAccessor(series, idx)), 
            fillDown: props.fillDown(props.fillDownAccessor(series, idx)), 
            xAccessor: props.xAccessor, 
            yAccessor: props.yAccessor, 
            hoverAnimation: props.hoverAnimation}
          )
        );
      });

    return (
      React.createElement(Chart, {
        viewBox: props.viewBox, 
        width: props.width, 
        height: props.height, 
        margins: props.margins, 
        title: props.title
      }, 
        React.createElement("g", {transform: trans, className: props.className}, 
          React.createElement(XAxis, {
            xAxisClassName: props.xAxisClassName, 
            xScale: scales.xScale, 
            xAxisTickValues: props.xAxisTickValues, 
            xAxisTickInterval: props.xAxisTickInterval, 
            xAxisOffset: props.xAxisOffset, 
            tickFormatting: props.xAxisFormatter, 
            xAxisLabel: props.xAxisLabel, 
            xAxisLabelOffset: props.xAxisLabelOffset, 
            xOrient: props.xOrient, 
            yOrient: props.yOrient, 
            margins: props.margins, 
            width: innerWidth, 
            height: innerHeight, 
            gridVertical: props.gridVertical, 
            gridVerticalStroke: props.gridVerticalStroke, 
            gridVerticalStrokeWidth: props.gridVerticalStrokeWidth, 
            gridVerticalStrokeDash: props.gridVerticalStrokeDash}
          ), 
          React.createElement(YAxis, {
            yAxisClassName: props.yAxisClassName, 
            yScale: scales.yScale, 
            yAxisTickValues: props.yAxisTickValues, 
            yAxisOffset: props.yAxisOffset, 
            yAxisTickCount: props.yAxisTickCount, 
            tickFormatting: props.yAxisFormatter, 
            yAxisLabel: props.yAxisLabel, 
            yAxisLabelOffset: props.yAxisLabelOffset, 
            xOrient: props.xOrient, 
            yOrient: props.yOrient, 
            margins: props.margins, 
            width: innerWidth, 
            height: props.height, 
            gridHorizontal: props.gridHorizontal, 
            gridHorizontalStroke: props.gridHorizontalStroke, 
            gridHorizontalStrokeWidth: props.gridHorizontalStrokeWidth, 
            gridHorizontalStrokeDash: props.gridHorizontalStrokeDash}
          ), 
          dataSeries
        )
      )
    );
  }

});

},{"../common":42,"../utils":68,"./DataSeries":27,"d3":5,"react":undefined}],26:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var utils = require('../utils');
var Candle = require('./Candle');
var Wick = require('./Wick');

module.exports = React.createClass({

  displayName: 'CandleStickContainer',

  propTypes: {
    candle_x:       React.PropTypes.number,
    candle_y:       React.PropTypes.number,
    className:      React.PropTypes.string,
    candleFill:     React.PropTypes.string,
    candleHeight:   React.PropTypes.number,
    candleWidth:    React.PropTypes.number,
    wick_x1:        React.PropTypes.number,
    wick_x2:        React.PropTypes.number,
    wick_y1:        React.PropTypes.number,
    wick_y2:        React.PropTypes.number,
  },

  getDefaultProps:function() {
    return {
      className: 'rd3-candlestick-container'
    };
  },

  getInitialState:function() {
    // state for animation usage
    return {
      candleWidth: this.props.candleWidth,
      candleFill: this.props.candleFill
    };
  },

  render:function() {

    var props = this.props;
    var state = this.state;

    // animation controller
    var handleMouseOver, handleMouseLeave;
    if(props.hoverAnimation) {
      handleMouseOver = this._animateCandle;
      handleMouseLeave = this._restoreCandle;
    } else {
      handleMouseOver = handleMouseLeave = null;
    }

    return (
      React.createElement("g", {className: props.className}, 
       React.createElement(Wick, {
         wick_x1: props.wick_x1, 
         wick_x2: props.wick_x2, 
         wick_y1: props.wick_y1, 
         wick_y2: props.wick_y2}
       ), 
       React.createElement(Candle, {
         candleFill: state.candleFill, 
         candleWidth: state.candleWidth, 
         candle_x: props.candle_x - ((state.candleWidth - props.candleWidth) / 2), 
         candle_y: props.candle_y, 
         candleHeight: props.candleHeight, 
         handleMouseOver: handleMouseOver, 
         handleMouseLeave: handleMouseLeave}
       )
      )
    );
  },

  _animateCandle:function() {
    this.setState({ 
      candleWidth: this.props.candleWidth * 1.5,
      candleFill: utils.shade(this.props.candleFill, -0.2)
    });
  },

  _restoreCandle:function() {
    this.setState({ 
      candleWidth: this.props.candleWidth,
      candleFill: this.props.candleFill
    });
  },

});

},{"../utils":68,"./Candle":24,"./Wick":28,"d3":5,"react":undefined}],27:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var utils = require('../utils');
var CandlestickContainer = require('./CandlestickContainer');


module.exports = React.createClass({

  displayName: 'DataSeries',

  propTypes: {
    fillUp:   React.PropTypes.string.isRequired,
    fillDown: React.PropTypes.string.isRequired
  },

  render:function() {

    var props = this.props;

    var xRange = props.xScale.range(),
        width = Math.abs(xRange[0] - xRange[1]),
        candleWidth = (width / (props.data.length + 2)) * 0.5;

    var dataSeriesArray = props.data.map( function(d, idx) {
      // Candles
      var ohlc = props.yAccessor(d),
        candle_x = props.xScale(props.xAccessor(d)) - 0.5 * candleWidth,
        candle_y = props.yScale(Math.max(ohlc.open, ohlc.close)),
        candleHeight = Math.abs(props.yScale(ohlc.open) - props.yScale(ohlc.close)),
        wick_y2 = props.yScale(ohlc.low),
        ohlcClass = (ohlc.open <= ohlc.close) ? 'up' : 'down',
        className = ( ohlcClass + " rd3-candlestick-rect"),
        candleFill = (ohlc.open <= ohlc.close) ? props.fillUp : props.fillDown;

      //Wicks
      var wick_x1 = props.xScale(props.xAccessor(d)),
        wick_y1 = props.yScale(ohlc.high),
        wick_x2 = wick_x1;

      return (
        React.createElement(CandlestickContainer, {
          key: idx, 
          candleFill: candleFill, 
          candleHeight: candleHeight, 
          candleWidth: candleWidth, 
          candle_x: candle_x, 
          candle_y: candle_y, 
          wick_x1: wick_x1, 
          wick_x2: wick_x2, 
          wick_y1: wick_y1, 
          wick_y2: wick_y2, 
          hoverAnimation: props.hoverAnimation}
        )
      );
    }, this);

    return (
      React.createElement("g", null, 
        dataSeriesArray
      )
    );
  }

});

},{"../utils":68,"./CandlestickContainer":26,"d3":5,"react":undefined}],28:[function(require,module,exports){
'use strict';

var React = require('react');


module.exports = React.createClass({

  displayName: 'Wick',

  propTypes: {
    className:      React.PropTypes.string,
    shapeRendering: React.PropTypes.string,
    stroke:         React.PropTypes.string,
    strokeWidth:    React.PropTypes.number,
  },

  getDefaultProps:function() {
    return {
      className:      'rd3-candlestick-wick',
      stroke:         '#000',
      strokeWidth:    1,
      shapeRendering: 'crispEdges',
    };
  },

  render:function() {
    var props = this.props;
    return React.createElement("line", {
            stroke: props.stroke, 
            strokeWidth: props.strokeWidth, 
            style: { shapeRendering: props.shapeRendering}, 
            className: props.className, 
            x1: props.wick_x1, 
            y1: props.wick_y1, 
            x2: props.wick_x2, 
            y2: props.wick_y2}
          );
  }

});

},{"react":undefined}],29:[function(require,module,exports){

exports.CandlestickChart = require('./CandlestickChart');

},{"./CandlestickChart":25}],30:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');

module.exports = React.createClass({

  displayName: 'Legend',

  propTypes: {
    className:     React.PropTypes.string,
    colors:        React.PropTypes.func,
    colorAccessor: React.PropTypes.func,
    data:          React.PropTypes.array.isRequired,
    itemClassName: React.PropTypes.string,
    margins:       React.PropTypes.object,
    text:          React.PropTypes.string,
    width:         React.PropTypes.number.isRequired
  },

  getDefaultProps: function() {
    return {
      className:    'rd3-legend',
      colors:        d3.scale.category20c(),
      colorAccessor: function(d, idx)  {return idx;},
      itemClassName: 'rd3-legend-item',
      text:          '#000'
    };
  },

  render: function() {

    var props = this.props;

    var textStyle = {
      'color': 'black',
      'fontSize': '50%',
      'verticalAlign': 'top'
    };

    var legendItems = [];

    props.data.forEach( function(series, idx)  {
      var itemStyle = {
        'color': props.colors(props.colorAccessor(series, idx)),
        'lineHeight': '60%',
        'fontSize': '200%'
      };

      legendItems.push(
        React.createElement("li", {
          key: idx, 
          className: props.itemClassName, 
          style: itemStyle
        }, 
          React.createElement("span", {
            style: textStyle
          }, 
            series.name
          )
        )
      );

    });

    var topMargin = props.margins.top;

    var legendBlockStyle = {
      'wordWrap': 'break-word',
      'width': props.width,
      'paddingLeft': '0',
      'marginBottom': '0',
      'marginTop': topMargin,
      'listStylePosition': 'inside'
    };

    return (
      React.createElement("ul", {
        className: props.className, 
        style: legendBlockStyle
      }, 
        legendItems
      )
    );
  }

});

},{"d3":5,"react":undefined}],31:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');

var Polygon = React.createClass({displayName: "Polygon",

  _animateCircle: function() {
    this.props.structure.cursor('voronoi').cursor(this.props.id).update(function(){return 'active';});
    // this.props.pubsub.emit('animate', this.props.id);
  },

  _restoreCircle: function() {
    this.props.structure.cursor('voronoi').cursor(this.props.id).update(function(){return 'inactive';});
    // this.props.pubsub.emit('restore', this.props.id);
  },

  _drawPath: function(d) {
    if(d === undefined) {
      return; 
    }  
    return 'M' + d.join(',') + 'Z';
  },

  render: function() {
    return React.createElement("path", {
      onMouseOver: this._animateCircle, 
      onMouseOut: this._restoreCircle, 
      fill: "white", 
      opacity: "0", 
      d: this._drawPath(this.props.vnode)});
  }

});


module.exports = React.createClass({

  displayName: 'Voronoi',

  render: function() {
    var xScale = this.props.xScale;
    var yScale = this.props.yScale;

    var voronoi = d3.geom.voronoi()
      .x(function(d){ return xScale(d.coord.x); })
      .y(function(d){ return yScale(d.coord.y); })
      .clipExtent([[0, 0], [ this.props.width , this.props.height]]);

    var regions = voronoi(this.props.data).map(function(vnode, idx) {
      return React.createElement(Polygon, {structure: this.props.structure, key: idx, id: vnode.point.id, vnode: vnode});
    }.bind(this));

    return (
      React.createElement("g", null, 
        regions
      )
    );
  }

});

},{"d3":5,"react":undefined}],32:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');

module.exports = React.createClass({

  displayName: 'AxisLine',

  propTypes: {
    scale: React.PropTypes.func.isRequired,
    innerTickSize: React.PropTypes.number,
    outerTickSize: React.PropTypes.number,
    tickPadding: React.PropTypes.number,
    tickArguments: React.PropTypes.array,
    fill: React.PropTypes.string,
    stroke: React.PropTypes.string
  },

  getDefaultProps:function() {
    return {
      innerTickSize: 6,
      outerTickSize: 6,
      tickPadding: 3,
      fill: 'none',
      tickArguments: [10],
      tickValues: null,
      tickFormat: null 
    };
  },


  _d3_scaleExtent:function(domain) {
    var start = domain[0], stop = domain[domain.length - 1];
    return start < stop ? [start, stop] : [stop, start];
  },

  _d3_scaleRange:function(scale) {
    return scale.rangeExtent ? scale.rangeExtent() : this._d3_scaleExtent(scale.range());
  },

  render:function() {

    var props = this.props;
    var sign = props.orient === "top" || props.orient === "left" ? -1 : 1;

    var range = this._d3_scaleRange(props.scale);

    var d;

    if (props.orient === "bottom" || props.orient === "top") {
      d = "M" + range[0] + "," + sign * props.outerTickSize + "V0H" + range[1] + "V" + sign * props.outerTickSize;
    } else {
      d = "M" + sign * props.outerTickSize + "," + range[0] + "H0V" + range[1] + "H" + sign * props.outerTickSize;
    }


    return (
      React.createElement("path", {
        className: "domain", 
        d: d, 
        style: {'shapeRendering':'crispEdges'}, 
        fill: props.fill, 
        stroke: props.stroke, 
        strokeWidth: props.strokeWidth
      }
      )
    );
  }
});

},{"d3":5,"react":undefined}],33:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');

module.exports = React.createClass({

  displayName: 'AxisTick',

  propTypes: {
    scale: React.PropTypes.func.isRequired,
    orient: React.PropTypes.oneOf(['top','bottom','left','right']).isRequired,
    orient2nd: React.PropTypes.oneOf(['top','bottom','left','right']),
    height: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
    tickArguments : React.PropTypes.array,
    tickValues: React.PropTypes.array,
    innerTickSize: React.PropTypes.number,
    outerTickSize: React.PropTypes.number,
    tickPadding: React.PropTypes.number,
    tickFormat: React.PropTypes.func,
    tickStroke: React.PropTypes.string,
    gridHorizontal: React.PropTypes.bool,
    gridVertical: React.PropTypes.bool,
    gridHorizontalStroke: React.PropTypes.string,
    gridVerticalStroke: React.PropTypes.string,
    gridHorizontalStrokeWidth: React.PropTypes.number,
    gridVerticalStrokeWidth: React.PropTypes.number,
    gridHorizontalStrokeDash: React.PropTypes.string,
    gridVerticalStrokeDash: React.PropTypes.string
  },
  getDefaultProps:function() {
    return {
      innerTickSize: 6,
      outerTickSize: 6,
      tickStroke: '#000',
      tickPadding: 3,
      tickArguments: [10],
      tickValues: null,
      gridHorizontal: false,
      gridVertical: false,
      gridHorizontalStroke: '#D8D7D7',
      gridVerticalStroke: '#D8D7D7',
      gridHorizontalStrokeWidth: 1,
      gridVerticalStrokeWidth: 1,
      gridHorizontalStrokeDash: '5, 5',
      gridVerticalStrokeDash: '5, 5'
    };
  },

  render:function() {
    var props = this.props;

    var tr,
        ticks,
        scale,
        adjustedScale,
        textAnchor,
        tickFormat,
        y0, y1, y2, dy, x0, x1, x2, dx;

    var gridStrokeWidth,
        gridStroke,
        gridStrokeDashArray,
        x2grid,
        y2grid;
    var gridOn = false;

    var sign = props.orient === 'top' || props.orient === 'right' ? -1 : 1;
    var tickSpacing = Math.max(props.innerTickSize, 0) + props.tickPadding;

    scale = props.scale;

    if (props.tickValues) {
      ticks = props.tickValues;
    } else if (scale.ticks) {
      ticks = scale.ticks.apply(scale, props.tickArguments);
    } else {
      ticks = scale.domain();
    }

    if (props.tickFormatting) {
        tickFormat = props.tickFormatting;
    } else if (scale.tickFormat) {
        tickFormat = scale.tickFormat.apply(scale, props.tickArguments);
    } else {
        tickFormat = function(d) {return d;};
    }

    adjustedScale = scale.rangeBand ? function(d)  { return scale(d) + scale.rangeBand() / 2; } : scale;

    // Still working on this
    // Ticks and lines are not fully aligned
    // in some orientations
    switch (props.orient) {
      case 'top':
        tr = function(tick)  {return ("translate(" + adjustedScale(tick) + ",0)");};
        textAnchor = "middle";
        y2 = props.innerTickSize * sign;
        y1 = tickSpacing * sign;
        dy =  sign < 0 ? "0em" : ".71em";
        x2grid = 0;
        y2grid = -props.height;
        break;
      case 'bottom':
        tr = function(tick)  {return ("translate(" + adjustedScale(tick) + ",0)");};
        textAnchor = "middle";
        y2 = props.innerTickSize * sign;
        y1 = tickSpacing * sign;
        dy =  sign < 0 ? "0em" : ".71em";
        x2grid = 0;
        y2grid = -props.height;
        break;
      case 'left':
        tr = function(tick)  {return ("translate(0," + adjustedScale(tick) + ")");};
        textAnchor = "end";
        x2 = props.innerTickSize * -sign;
        x1 = tickSpacing * -sign;
        dy = ".32em";
        x2grid = props.width;
        y2grid = 0;
        break;
      case 'right':
        tr = function(tick)  {return ("translate(0," + adjustedScale(tick) + ")");};
        textAnchor = "start";
        x2 = props.innerTickSize * -sign;
        x1 = tickSpacing * -sign;
        dy = ".32em";
        x2grid = -props.width;
        y2grid = 0;
        break;
    }

    if (props.gridHorizontal) {
      gridOn = true;
      gridStrokeWidth = props.gridHorizontalStrokeWidth;
      gridStroke = props.gridHorizontalStroke;
      gridStrokeDashArray = props.gridHorizontalStrokeDash;
    }
    else if (props.gridVertical) {
      gridOn = true;
      gridStrokeWidth = props.gridVerticalStrokeWidth;
      gridStroke = props.gridVerticalStroke;
      gridStrokeDashArray = props.gridVerticalStrokeDash;
    }

    // return grid line if grid is enabled and grid line is not on at same position as other axis.
    var gridLine = function(pos) {
      if (gridOn
        && !(props.orient2nd == 'left' && pos == 0)
        && !(props.orient2nd == 'right' && pos == props.width)
        && !((props.orient == 'left' || props.orient == 'right') && pos == props.height)
      ) {
        return (
          React.createElement("line", {style: {
            strokeWidth: gridStrokeWidth,
            shapeRendering: 'crispEdges',
            stroke: gridStroke,
            strokeDasharray: gridStrokeDashArray
            }, x2: x2grid, y2: y2grid})
        )
      }
    }

    return (
    React.createElement("g", null, 
      ticks.map( function(tick, idx)  {
        return (
          React.createElement("g", {key: idx, className: "tick", transform: tr(tick)}, 
            gridLine(adjustedScale(tick)), 
            React.createElement("line", {style: {shapeRendering:'crispEdges',opacity:'1',stroke:props.tickStroke}, x2: x2, y2: y2}
            ), 
            React.createElement("text", {
              strokeWidth: "0.01", 
              dy: dy, x: x1, y: y1, 
              style: {stroke:props.tickTextStroke, fill:props.tickTextStroke}, 
              textAnchor: textAnchor
            }, 
              tickFormat(tick)
            )
          )
        );
        })
      
    )
    );
  }

});

},{"d3":5,"react":undefined}],34:[function(require,module,exports){
'use strict';

var React = require('react');


module.exports = React.createClass({

  displayName: 'Label',

  propTypes: {
    height:              React.PropTypes.number,
    horizontalTransform: React.PropTypes.string,
    label:               React.PropTypes.string.isRequired,
    width:               React.PropTypes.number,
    strokeWidth:         React.PropTypes.number,
    textAnchor:          React.PropTypes.string,
    verticalTransform:   React.PropTypes.string
  },

  getDefaultProps:function() {
    return {
      horizontalTransform: 'rotate(270)',
      strokeWidth:         0.01,
      textAnchor:          'middle',
      verticalTransform:   'rotate(0)'
    };
  },

  render:function() {

    var props = this.props;

    if (props.label) {
      switch (props.orient) {
        case 'top':
          return (
            React.createElement("text", {
              strokeWidth: props.strokeWidth.toString(), 
              textAnchor: props.textAnchor, 
              transform: props.verticalTransform, 
              x: props.width / 2, 
              y: props.offset
            }, 
              props.label
            )
          );
        case 'bottom':
          return (
            React.createElement("text", {
              strokeWidth: props.strokeWidth.toString(), 
              textAnchor: props.textAnchor, 
              transform: props.verticalTransform, 
              x: props.width / 2, 
              y: props.offset
            }, 
              props.label
            )
          );
        case 'left':
          return (
            React.createElement("text", {
              strokeWidth: props.strokeWidth.toString(), 
              textAnchor: props.textAnchor, 
              transform: props.horizontalTransform, 
              y: -props.offset, 
              x: -props.height / 2
            }, 
              props.label
            )
          );
        case 'right':
          return (
            React.createElement("text", {
              strokeWidth: props.strokeWidth.toString(), 
              textAnchor: props.textAnchor, 
              transform: props.horizontalTransform, 
              y: props.offset, 
              x: -props.height / 2
            }, 
              props.label
            )
          );
      }
    }
    return React.createElement("text", null);
  }

});

},{"react":undefined}],35:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var AxisTicks = require('./AxisTicks');
var AxisLine = require('./AxisLine');
var Label = require('./Label');

module.exports = React.createClass({

  displayName: 'XAxis',

  propTypes: {
    fill:            React.PropTypes.string,
    height:          React.PropTypes.number.isRequired,
    width:           React.PropTypes.number.isRequired,
    stroke:          React.PropTypes.string,
    strokeWidth:     React.PropTypes.string,
    tickStroke:      React.PropTypes.string,
    xAxisClassName:  React.PropTypes.string,
    xAxisLabel:      React.PropTypes.string,
    xAxisTickValues: React.PropTypes.array,
    xAxisOffset:     React.PropTypes.number,
    xScale:          React.PropTypes.func.isRequired,
    xOrient:         React.PropTypes.oneOf(['top', 'bottom']),
    yOrient:         React.PropTypes.oneOf(['left', 'right']),
    gridVertical:  React.PropTypes.bool,
    gridVerticalStroke: React.PropTypes.string,
    gridVerticalStrokeWidth: React.PropTypes.number,
    gridVerticalStrokeDash: React.PropTypes.string
  },

  getDefaultProps:function() {
    return {
      fill:            'none',
      stroke:          'none',
      strokeWidth:     '1',
      tickStroke:      '#000',
      xAxisClassName:  'rd3-x-axis',
      xAxisLabel:      '',
      xAxisLabelOffset: 10,
      xAxisOffset:      0,
      xOrient:         'bottom',
      yOrient:         'left'
    };
  },

  render:function() {
    var props = this.props;

    var t = ("translate(0 ," + (props.xAxisOffset + props.height) + ")");

    var tickArguments;
    if (typeof props.xAxisTickCount !== 'undefined') {
      tickArguments = [props.xAxisTickCount];
    }

    if (typeof props.xAxisTickInterval !== 'undefined') {
      tickArguments = [d3.time[props.xAxisTickInterval.unit], props.xAxisTickInterval.interval];
    }

    return (
      React.createElement("g", {
        className: props.xAxisClassName, 
        transform: t
      }, 
        React.createElement(AxisTicks, {
          tickValues: props.xAxisTickValues, 
          tickFormatting: props.tickFormatting, 
          tickArguments: tickArguments, 
          tickStroke: props.tickStroke, 
          tickTextStroke: props.tickTextStroke, 
          innerTickSize: props.tickSize, 
          scale: props.xScale, 
          orient: props.xOrient, 
          orient2nd: props.yOrient, 
          height: props.height, 
          width: props.width, 
          gridVertical: props.gridVertical, 
          gridVerticalStroke: props.gridVerticalStroke, 
          gridVerticalStrokeWidth: props.gridVerticalStrokeWidth, 
          gridVerticalStrokeDash: props.gridVerticalStrokeDash}
        ), 
        React.createElement(AxisLine, React.__spread({
          scale: props.xScale, 
          stroke: props.stroke, 
          orient: props.xOrient, 
          outerTickSize: props.tickSize}, 
          props)
        ), 
        React.createElement(Label, {
          label: props.xAxisLabel, 
          offset: props.xAxisLabelOffset, 
          orient: props.xOrient, 
          margins: props.margins, 
          width: props.width}
          )
      )
    );
  }

});

},{"./AxisLine":32,"./AxisTicks":33,"./Label":34,"d3":5,"react":undefined}],36:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var AxisTicks = require('./AxisTicks');
var AxisLine = require('./AxisLine');
var Label = require('./Label');

module.exports = React.createClass({

  displayName: 'YAxis',

  propTypes: {
    fill:            React.PropTypes.string,
    stroke:          React.PropTypes.string,
    strokeWidth:     React.PropTypes.string,
    tickStroke:      React.PropTypes.string,
    width:           React.PropTypes.number.isRequired,
    height:          React.PropTypes.number.isRequired,
    yAxisClassName:  React.PropTypes.string,
    yAxisLabel:      React.PropTypes.string,
    yAxisOffset:     React.PropTypes.number,
    yAxisTickValues: React.PropTypes.array,
    xOrient:         React.PropTypes.oneOf(['top', 'bottom']),
    yOrient:         React.PropTypes.oneOf(['left', 'right']),
    yScale:          React.PropTypes.func.isRequired,
    gridVertical: React.PropTypes.bool,
    gridVerticalStroke: React.PropTypes.string,
    gridVerticalStrokeWidth: React.PropTypes.number,
    gridVerticalStrokeDash: React.PropTypes.string
  },

  getDefaultProps:function() {
    return {
      fill:           'none',
      stroke:         '#000',
      strokeWidth:    '1',
      tickStroke:     '#000',
      yAxisClassName: 'rd3-y-axis',
      yAxisLabel:     '',
      yAxisOffset:    0,
      xOrient:        'bottom',
      yOrient:        'left'
    };
  },

  render:function() {

    var props = this.props;

    var t;
    if (props.yOrient === 'right') {
       t = ("translate(" + (props.yAxisOffset + props.width) + ", 0)");
    } else {
       t = ("translate(" + props.yAxisOffset + ", 0)");
    }

    var tickArguments;
    if (props.yAxisTickCount) {
      tickArguments = [props.yAxisTickCount];
    }

    if (props.yAxisTickInterval) {
      tickArguments = [d3.time[props.yAxisTickInterval.unit], props.yAxisTickInterval.interval];
    }

    return (
      React.createElement("g", {
        className: props.yAxisClassName, 
        transform: t
      }, 
        React.createElement(AxisTicks, {
          innerTickSize: props.tickSize, 
          orient: props.yOrient, 
          orient2nd: props.xOrient, 
          tickArguments: tickArguments, 
          tickFormatting: props.tickFormatting, 
          tickStroke: props.tickStroke, 
          tickTextStroke: props.tickTextStroke, 
          tickValues: props.yAxisTickValues, 
          scale: props.yScale, 
          height: props.height, 
          width: props.width, 
          gridHorizontal: props.gridHorizontal, 
          gridHorizontalStroke: props.gridHorizontalStroke, 
          gridHorizontalStrokeWidth: props.gridHorizontalStrokeWidth, 
          gridHorizontalStrokeDash: props.gridHorizontalStrokeDash}
        ), 
        React.createElement(AxisLine, React.__spread({
          orient: props.yOrient, 
          outerTickSize: props.tickSize, 
          scale: props.yScale, 
          stroke: props.stroke}, 
          props)
        ), 
        React.createElement(Label, {
          height: props.height, 
          label: props.yAxisLabel, 
          margins: props.margins, 
          offset: props.yAxisLabelOffset, 
          orient: props.yOrient}
        )
      )
    );
  }

});

},{"./AxisLine":32,"./AxisTicks":33,"./Label":34,"d3":5,"react":undefined}],37:[function(require,module,exports){

exports.XAxis = require('./XAxis');
exports.YAxis = require('./YAxis');

},{"./XAxis":35,"./YAxis":36}],38:[function(require,module,exports){
'use strict';

var React = require('react');
var mixins = require('../../mixins');

module.exports = React.createClass({

  displayName: 'BasicChart',

  propTypes: {
    children:       React.PropTypes.node,
    className:      React.PropTypes.string,
    height:         React.PropTypes.node,
    svgClassName:   React.PropTypes.string,
    title:          React.PropTypes.node,
    titleClassName: React.PropTypes.string,
    width:          React.PropTypes.node
  },

  getDefaultProps:function() {
    return {
      className:      'rd3-basic-chart',
      svgClassName:   'rd3-chart',
      titleClassName: 'rd3-chart-title'
    };
  },

  _renderTitle:function() {
    var props = this.props;

    if (props.title != '' && props.title != null) {
      return (
        React.createElement("h4", {
          className: props.titleClassName
        }, 
          props.title
        )
      );
    } else {
      return null;
    }
  },

  _renderChart: function() {
    var props = this.props;

    return (
      React.createElement("svg", {
        className: props.svgClassName, 
        height: props.height, 
        viewBox: props.viewBox, 
        width: props.width
      }, 
        props.children
      )
    );
  },

  render: function() {
    var props = this.props;

    return (
      React.createElement("div", {
        className: props.className
      }, 
        this._renderTitle(), 
        this._renderChart()
      )
    );
  }
});

},{"../../mixins":52,"react":undefined}],39:[function(require,module,exports){
'use strict';

var React = require('react');
var LegendChart = require('./LegendChart');
var BasicChart = require('./BasicChart');

module.exports = React.createClass({

  displayName: 'Chart',

  propTypes: {
    legend:         React.PropTypes.bool,
    svgClassName:   React.PropTypes.string,
    titleClassName: React.PropTypes.string
  },

  getDefaultProps: function() {
    return {
      legend:         false,
      svgClassName:   'rd3-chart',
      titleClassName: 'rd3-chart-title'
    };
  },

  render: function() {
    var props = this.props;

    if (props.legend) {
      return (
        React.createElement(LegendChart, React.__spread({
          svgClassName: props.svgClassName, 
          titleClassName: props.titleClassName}, 
          this.props)
        )
      );
    }
    return (
      React.createElement(BasicChart, React.__spread({
        svgClassName: props.svgClassName, 
        titleClassName: props.titleClassName}, 
        this.props)
      )
    );
  }

});

},{"./BasicChart":38,"./LegendChart":40,"react":undefined}],40:[function(require,module,exports){
'use strict';

var React = require('react');
var Legend = require('../Legend');
var d3 = require('d3');

module.exports = React.createClass({

  displayName: 'LegendChart',

  propTypes: {
    children:       React.PropTypes.node,
    createClass:    React.PropTypes.string,
    colors:         React.PropTypes.func,
    colorAccessor:  React.PropTypes.func,
    data:           React.PropTypes.array,
    height:         React.PropTypes.node,
    legend:         React.PropTypes.bool,
    legendPosition: React.PropTypes.string,
    margins:        React.PropTypes.object,
    sideOffset:     React.PropTypes.number,
    svgClassName:   React.PropTypes.string,
    title:          React.PropTypes.node,
    titleClassName: React.PropTypes.string,
    viewBox:        React.PropTypes.string,
    width:          React.PropTypes.node
  },

  getDefaultProps:function() {
    return {
      className:      'rd3-legend-chart',
      colors:         d3.scale.category20c(),
      colorAccessor:  function(d, idx)  {return idx;},
      data:           [],
      legend:         false,
      legendPosition: 'right',
      sideOffset:     90,
      svgClassName:   'rd3-chart',
      titleClassName: 'rd3-chart-title'
    };
  },

  _renderLegend:function() {
    var props = this.props;

    if (props.legend) {
      return (
        React.createElement(Legend, {
          colors: props.colors, 
          colorAccessor: props.colorAccessor, 
          data: props.data, 
          legendPosition: props.legendPosition, 
          margins: props.margins, 
          width: props.sideOffset}
        )
      );
    }
  },

  _renderTitle:function() {
    var props = this.props;

    if (props.title != '' && props.title != null) {
      return (
        React.createElement("h4", {
          className: props.titleClassName
        }, 
          props.title
        )
      );
    }
    return null;
  },

  _renderChart: function() {
    var props = this.props;

    return (
      React.createElement("svg", {
        className: props.svgClassName, 
        height: "100%", 
        viewBox: props.viewBox, 
        width: "100%"
      }, 
        props.children
      )
    );
  },

  render:function() {
    var props = this.props;

    return (
      React.createElement("div", {
        className: props.className, 
        style: {'width': props.width, 'height': props.height}
      }, 
        this._renderTitle(), 
        React.createElement("div", {style: { display: 'table', width: '100%', height: '100%'}}, 
          React.createElement("div", {style: { display: 'table-cell'}}, 
            this._renderChart()
          ), 
          React.createElement("div", {style: { display: 'table-cell', width: props.sideOffset, 'verticalAlign': 'top'}}, 
            this._renderLegend()
          )
        )
      )
    );
  }
});

},{"../Legend":30,"d3":5,"react":undefined}],41:[function(require,module,exports){

exports.BasicChart = require('./BasicChart');
exports.Chart = require('./Chart');
exports.LegendChart = require('./LegendChart');

},{"./BasicChart":38,"./Chart":39,"./LegendChart":40}],42:[function(require,module,exports){

exports.XAxis = require('./axes').XAxis;
exports.YAxis = require('./axes').YAxis;
exports.Chart = require('./charts').Chart;
exports.LegendChart = require('./charts').LegendChart;
exports.Legend = require('./Legend');
exports.Voronoi = require('./Voronoi');

},{"./Legend":30,"./Voronoi":31,"./axes":37,"./charts":41}],43:[function(require,module,exports){
exports.BarChart = require('./barchart').BarChart;
exports.LineChart = require('./linechart').LineChart;
exports.PieChart = require('./piechart').PieChart;
exports.AreaChart = require('./areachart').AreaChart;
exports.Treemap = require('./treemap').Treemap;
exports.ScatterChart = require('./scatterchart').ScatterChart;
exports.CandlestickChart = require('./candlestick').CandlestickChart;


},{"./areachart":18,"./barchart":23,"./candlestick":29,"./linechart":49,"./piechart":57,"./scatterchart":62,"./treemap":67}],44:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var VoronoiCircleContainer = require('./VoronoiCircleContainer');
var Line = require('./Line');

module.exports = React.createClass({

  displayName: 'DataSeries',

  propTypes: {
    color: React.PropTypes.func,
    colorAccessor: React.PropTypes.func,
    data: React.PropTypes.array,
    interpolationType: React.PropTypes.string,
    xAccessor: React.PropTypes.func,
    yAccessor: React.PropTypes.func,
  },

  getDefaultProps:function() {
    return {
      data: [],
      xAccessor: function(d)  {return d.x;},
      yAccessor: function(d)  {return d.y;},
      interpolationType: 'linear'
    };
  },
  
  _isDate:function(d, accessor) {
      return Object.prototype.toString.call(accessor(d)) === '[object Date]';
  },

  render:function() {
    var props = this.props;
    var xScale = props.xScale;
    var yScale = props.yScale;
    var xAccessor = props.xAccessor,
        yAccessor = props.yAccessor;
    
    var interpolatePath = d3.svg.line()
        .y( function(d)  {return props.yScale(yAccessor(d));} )
        .interpolate(props.interpolationType);

        if (this._isDate(props.data[0].values[0], xAccessor)) {
          interpolatePath.x(function(d) {
            return props.xScale(props.xAccessor(d).getTime());
          });
        } else {
          interpolatePath.x(function(d) {
            return props.xScale(props.xAccessor(d));
          });
        }

    var lines = props.data.map(function(series, idx)  {
      return (
        React.createElement(Line, {
          path: interpolatePath(series.values), 
          stroke: props.colors(props.colorAccessor(series, idx)), 
          strokeWidth: series.strokeWidth, 
          strokeDashArray: series.strokeDashArray, 
          seriesName: series.name, 
          key: idx}
        )
      );
    });

    var voronoi = d3.geom.voronoi()
      .x(function(d){ return xScale(d.coord.x); })
      .y(function(d){ return yScale(d.coord.y); })
      .clipExtent([[0, 0], [ props.width , props.height]]);

    var cx, cy, circleFill;
    var regions = voronoi(props.value).map(function(vnode, idx) {
      var point = vnode.point.coord;
      if (Object.prototype.toString.call(xAccessor(point)) === '[object Date]') {
        cx = props.xScale(xAccessor(point).getTime());
      } else {
        cx = props.xScale(xAccessor(point));
      }
      if (Object.prototype.toString.call(yAccessor(point)) === '[object Date]') {
        cy = props.yScale(yAccessor(point).getTime());
      } else {
        cy = props.yScale(yAccessor(point));
      }
      circleFill = props.colors(props.colorAccessor(vnode, vnode.point.seriesIndex));
      
      return (
          React.createElement(VoronoiCircleContainer, {
              key: idx, 
              circleFill: circleFill, 
              vnode: vnode, 
              cx: cx, cy: cy, 
              circleRadius: props.circleRadius}
          )
      );
    }.bind(this));

    return (
      React.createElement("g", null, 
        React.createElement("g", null, regions), 
        React.createElement("g", null, lines)
      )
    );
  }

});

},{"./Line":45,"./VoronoiCircleContainer":48,"d3":5,"react":undefined}],45:[function(require,module,exports){
'use strict';

var React = require('react');


module.exports = React.createClass({

  displayName: 'Line',

  propTypes: {
    fill: React.PropTypes.string,
    path: React.PropTypes.string,
    stroke: React.PropTypes.string,
    strokeWidth: React.PropTypes.number,
    strokeDashArray: React.PropTypes.string,
  },

  getDefaultProps:function() {
    return {
      stroke: '#3182bd',
      fill: 'none',
      strokeWidth: 1,
      className: 'rd3-linechart-path'
    };
  },

  render:function() {
    var props = this.props;
    return (
      React.createElement("path", {
        d: props.path, 
        stroke: props.stroke, 
        strokeWidth: props.strokeWidth, 
        strokeDasharray: props.strokeDashArray, 
        fill: props.fill, 
        className: props.className}
      )
    );
  }

});

},{"react":undefined}],46:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var $__0=      require('../common'),Chart=$__0.Chart,XAxis=$__0.XAxis,YAxis=$__0.YAxis;
var DataSeries = require('./DataSeries');
var utils = require('../utils');
var $__1=     require('../mixins'),CartesianChartPropsMixin=$__1.CartesianChartPropsMixin,ViewBoxMixin=$__1.ViewBoxMixin;

module.exports = React.createClass({

  mixins: [ CartesianChartPropsMixin, ViewBoxMixin ],

  displayName: 'LineChart',

  propTypes: {
    circleRadius:   React.PropTypes.number,
    hoverAnimation: React.PropTypes.bool,
    margins:        React.PropTypes.object,
 },

  getDefaultProps:function() {
    return {
      circleRadius:    3,
      className: 'rd3-linechart',
      hoverAnimation: true,
      margins:        {top: 10, right: 20, bottom: 50, left: 45},
      xAxisClassName: 'rd3-linechart-xaxis',
      yAxisClassName: 'rd3-linechart-yaxis',
    };
  },

  _calculateScales: utils.calculateScales,

  render:function() {

    var props = this.props;

    if (this.props.data && this.props.data.length < 1) {
      return null;
    }

    // Calculate inner chart dimensions
    var innerWidth, innerHeight;

    innerWidth = this.getOuterDimensions().width - props.margins.left - props.margins.right;
    innerHeight = this.getOuterDimensions().height - props.margins.top - props.margins.bottom;

    if (!Array.isArray(props.data)) {
      props.data = [props.data];
    }

    // Returns an object of flattened allValues, xValues, and yValues
    var flattenedData = utils.flattenData(props.data, props.xAccessor, props.yAccessor);

    var allValues = flattenedData.allValues,
        xValues = flattenedData.xValues,
        yValues = flattenedData.yValues;
    var scales = this._calculateScales(innerWidth, innerHeight, xValues, yValues);
    var trans = "translate(" + (props.yAxisOffset < 0 ? props.margins.left + Math.abs(props.yAxisOffset) : props.margins.left) + "," + props.margins.top + ")";

    return (
      React.createElement(Chart, {
        viewBox: this.getViewBox(), 
        legend: props.legend, 
        data: props.data, 
        margins: props.margins, 
        colors: props.colors, 
        colorAccessor: props.colorAccessor, 
        width: props.width, 
        height: props.height, 
        title: props.title}, 
        React.createElement("g", {transform: trans, className: props.className}, 
          React.createElement(XAxis, {
            xAxisClassName: props.xAxisClassName, 
            strokeWidth: props.xAxisStrokeWidth, 
            xAxisTickValues: props.xAxisTickValues, 
            xAxisTickInterval: props.xAxisTickInterval, 
            xAxisOffset: props.xAxisOffset, 
            xScale: scales.xScale, 
            xAxisLabel: props.xAxisLabel, 
            xAxisLabelOffset: props.xAxisLabelOffset, 
            tickFormatting: props.xAxisFormatter, 
            xOrient: props.xOrient, 
            yOrient: props.yOrient, 
            data: props.data, 
            margins: props.margins, 
            width: innerWidth, 
            height: innerHeight, 
            stroke: props.axesColor, 
            gridVertical: props.gridVertical, 
            gridVerticalStroke: props.gridVerticalStroke, 
            gridVerticalStrokeWidth: props.gridVerticalStrokeWidth, 
            gridVerticalStrokeDash: props.gridVerticalStrokeDash}
          ), 
          React.createElement(YAxis, {
            yAxisClassName: props.yAxisClassName, 
            strokeWidth: props.yAxisStrokeWidth, 
            yScale: scales.yScale, 
            yAxisTickValues: props.yAxisTickValues, 
            yAxisTickCount: props.yAxisTickCount, 
            yAxisOffset: props.yAxisOffset, 
            yAxisLabel: props.yAxisLabel, 
            yAxisLabelOffset: props.yAxisLabelOffset, 
            tickFormatting: props.yAxisFormatter, 
            xOrient: props.xOrient, 
            yOrient: props.yOrient, 
            margins: props.margins, 
            width: innerWidth, 
            height: innerHeight, 
            stroke: props.axesColor, 
            gridHorizontal: props.gridHorizontal, 
            gridHorizontalStroke: props.gridHorizontalStroke, 
            gridHorizontalStrokeWidth: props.gridHorizontalStrokeWidth, 
            gridHorizontalStrokeDash: props.gridHorizontalStrokeDash}
          ), 
          React.createElement(DataSeries, {
            xScale: scales.xScale, 
            yScale: scales.yScale, 
            xAccessor: props.xAccessor, 
            yAccessor: props.yAccessor, 
            hoverAnimation: props.hoverAnimation, 
            circleRadius: props.circleRadius, 
            data: props.data, 
            value: allValues, 
            interpolationType: props.interpolationType, 
            colors: props.colors, 
            colorAccessor: props.colorAccessor, 
            width: innerWidth, 
            height: innerHeight}
            )
        )
      )
    );
  }

});

},{"../common":42,"../mixins":52,"../utils":68,"./DataSeries":44,"d3":5,"react":undefined}],47:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');

module.exports = React.createClass({

  displayName: 'VoronoiCircle',

  getDefaultProps:function() {
    return { 
      circleRadius: 3,
      circleFill: '#1f77b4',
    };
  },

  render:function() {
    return (
      React.createElement("g", null, 
        React.createElement("path", {
          onMouseOver: this.props.handleMouseOver, 
          onMouseLeave: this.props.handleMouseLeave, 
          fill: "transparent", 
          d: this.props.voronoiPath}
        ), 
        React.createElement("circle", {
          onMouseOver: this.props.handleMouseOver, 
          onMouseLeave: this.props.handleMouseLeave, 
          cx: this.props.cx, 
          cy: this.props.cy, 
          r: this.props.circleRadius, 
          fill: this.props.circleFill, 
          className: "rd3-linechart-circle"}
        )
      )
    );
  },
});

},{"d3":5,"react":undefined}],48:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var shade = require('../utils').shade;
var VoronoiCircle = require('./VoronoiCircle');

module.exports = React.createClass({

  displayName: 'VornoiCircleContainer',

  getDefaultProps:function() {
    return { 
      circleRadius: 3,
      circleFill: '#1f77b4',
      hoverAnimation: true
    };
  },

  getInitialState:function() {
    return { 
      circleRadius: this.props.circleRadius,
      circleFill: this.props.circleFill
    };
  },

  render:function() {

    var props = this.props;

    // animation controller
    var handleMouseOver, handleMouseLeave;
    if(props.hoverAnimation) {
      handleMouseOver = this._animateCircle;
      handleMouseLeave = this._restoreCircle;
    } else {
      handleMouseOver = handleMouseLeave = null;
    }

    return (
      React.createElement("g", null, 
        React.createElement(VoronoiCircle, {
            handleMouseOver: handleMouseOver, 
            handleMouseLeave: handleMouseLeave, 
            voronoiPath: this._drawPath(props.vnode), 
            cx: props.cx, 
            cy: props.cy, 
            circleRadius: this.state.circleRadius, 
            circleFill: this.state.circleFill}
        )
      )
    );
  },

  _animateCircle:function() {
    this.setState({ 
      circleRadius: this.props.circleRadius * ( 5 / 4 ),
      circleFill: shade(this.props.circleFill, 0.2)
    });
  },

  _restoreCircle:function() {
    this.setState({ 
      circleRadius: this.props.circleRadius,
      circleFill: this.props.circleFill
    });
  },

  _drawPath: function(d) {
    if(d === undefined) {
      return; 
    }  
    return 'M' + d.join(',') + 'Z';
  },
});

},{"../utils":68,"./VoronoiCircle":47,"d3":5,"react":undefined}],49:[function(require,module,exports){

exports.LineChart = require('./LineChart');

},{"./LineChart":46}],50:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');

module.exports =  {

  propTypes: {
    axesColor:         React.PropTypes.string,
    colors:            React.PropTypes.func,
    colorAccessor:     React.PropTypes.func,
    data:              React.PropTypes.array.isRequired,
    height:            React.PropTypes.number,
    legend:            React.PropTypes.bool,
    legendOffset:      React.PropTypes.number,
    title:             React.PropTypes.string,
    width:             React.PropTypes.number,
    xAccessor:         React.PropTypes.func,
    xAxisFormatter:    React.PropTypes.func,
    xAxisLabel:        React.PropTypes.string,
    xAxisLabelOffset:  React.PropTypes.number,
    xAxisTickCount:    React.PropTypes.number,
    xAxisTickInterval: React.PropTypes.object,
    xAxisTickValues:   React.PropTypes.array,
    xOrient:           React.PropTypes.oneOf(['top', 'bottom']),
    yAccessor:         React.PropTypes.func,
    yAxisFormatter:    React.PropTypes.func,
    yAxisLabel:        React.PropTypes.string,
    yAxisLabelOffset:  React.PropTypes.number,
    yAxisTickCount:    React.PropTypes.number,
    yAxisTickInterval: React.PropTypes.object,
    yAxisTickValues:   React.PropTypes.array,
    yOrient:           React.PropTypes.oneOf(['left', 'right'])
  },

  getDefaultProps: function() {
    return {
      axesColor:        '#000',
      colors:           d3.scale.category20c(),
      colorAccessor:    function(d, idx)  {return idx;},
      height:           200,
      legend:           false,
      legendOffset:     120,
      title:            '',
      width:            400,
      xAccessor:        function(d)  {return d.x;},
      // xAxisFormatter: no predefined value right now
      xAxisLabel:       '',
      xAxisLabelOffset: 38,
      // xAxisTickCount: no predefined value right now
      // xAxisTickInterval: no predefined value right now
      // xAxisTickValues: no predefined value right now
      xOrient:          'bottom',
      yAccessor:        function(d)  {return d.y;},
      // yAxisFormatter: no predefined value right now
      yAxisLabel:       '',
      yAxisLabelOffset: 35,
      // yAxisTickCount: no predefined value right now
      // yAxisTickInterval: no predefined value right now
      // yAxisTickValues: no predefined value right now
      yOrient:          'left'
    };
  }
};

},{"d3":5,"react":undefined}],51:[function(require,module,exports){

'use strict';

var React = require('react');

module.exports =  {

  propTypes: {
    viewBox:           React.PropTypes.string,
    viewBoxObject:     React.PropTypes.object
  },

  getViewBox:function() {
    if (this.props.viewBoxObject) {
      var v = this.props.viewBoxObject;
      return [v.x, v.y, v.width, v.height].join(' ');
    } else if (this.props.viewBox) {
      return this.props.viewBox;
    } 
  },

  getOuterDimensions:function() {
    if (this.props.viewBoxObject) {
      return {
        width: this.props.viewBoxObject.width,
        height: this.props.viewBoxObject.height
      };
    } else {
      return {
        width: this.props.width,
        height: this.props.height
      };
    }
  }

};

},{"react":undefined}],52:[function(require,module,exports){

exports.CartesianChartPropsMixin = require('./CartesianChartPropsMixin');
exports.ViewBoxMixin = require('./ViewBoxMixin');

},{"./CartesianChartPropsMixin":50,"./ViewBoxMixin":51}],53:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');


module.exports = React.createClass({

  displayName: 'Arc',

  propTypes: {
    fill: React.PropTypes.string,
    d: React.PropTypes.string,
    startAngle: React.PropTypes.number,
    endAngle: React.PropTypes.number,
    innerRadius: React.PropTypes.number,
    outerRadius: React.PropTypes.number,
    labelTextFill: React.PropTypes.string,
    valueTextFill: React.PropTypes.string,
    sectorBorderColor: React.PropTypes.string,
    showInnerLabels: React.PropTypes.bool,
    showOuterLabels: React.PropTypes.bool
  },

  getDefaultProps:function() {
    return {
      labelTextFill: 'black',
      valueTextFill: 'white',
      showInnerLabels: true,
      showOuterLabels: true
    };
  },

  render:function() {
    var props = this.props;

    var arc = d3.svg.arc()
      .innerRadius(props.innerRadius)
      .outerRadius(props.outerRadius)
      .startAngle(props.startAngle)
      .endAngle(props.endAngle);

    return (
      React.createElement("g", {className: "rd3-piechart-arc"}, 
        React.createElement("path", {
          d: arc(), 
          fill: props.fill, 
          stroke: props.sectorBorderColor, 
          onMouseOver: props.handleMouseOver, 
          onMouseLeave: props.handleMouseLeave}
        ), 
        props.showOuterLabels ? this.renderOuterLabel(props, arc) : null, 
        props.showInnerLabels ? this.renderInnerLabel(props, arc) : null
      )
    );
  },

  renderInnerLabel:function(props, arc) {
    // make value text can be formatted
    var formattedValue = props.valueTextFormatter(props.value);
    return (
        React.createElement("text", {
          className: "rd3-piechart-value", 
          transform: ("translate(" + arc.centroid() + ")"), 
          dy: ".35em", 
          style: {
            'shapeRendering': 'crispEdges',
            'textAnchor': 'middle',
            'fill': props.valueTextFill
          }}, 
           formattedValue 
        )
      );
  },

  renderOuterLabel:function(props, arc) {

    var rotate = ("rotate(" + ( (props.startAngle+props.endAngle)/2 * (180/Math.PI)) + ")");
    var positions = arc.centroid();
    var radius = props.outerRadius;
    var dist   = radius + 35;
    var angle  = (props.startAngle + props.endAngle) / 2;
    var x      = dist * (1.2 * Math.sin(angle));
    var y      = -dist * Math.cos(angle);
    var t = ("translate(" + x + "," + y + ")");

    return  (
      React.createElement("g", null, 
        React.createElement("line", {
          x1: "0", 
          x2: "0", 
          y1: -radius - 2, 
          y2: -radius - 26, 
          stroke: props.labelTextFill, 
          transform: rotate, 
          style: {
            'fill': props.labelTextFill,
            'strokeWidth': 2
          }
          }
        ), 
        React.createElement("text", {
          className: "rd3-piechart-label", 
          transform: t, 
          dy: ".35em", 
          style: {
            'textAnchor': 'middle',
            'fill': props.labelTextFill,
            'shapeRendering': 'crispEdges'
          }}, 
          props.label
        )
      )
    );
  }
});

},{"d3":5,"react":undefined}],54:[function(require,module,exports){
'use strict';

var React = require('react');
var shade = require('../utils').shade;
var Arc = require('./Arc');

module.exports = React.createClass({

  displayName: 'ArcContainer',

  propTypes: {
    fill: React.PropTypes.string
  },

  getInitialState:function() {
    return {
      // fill is named as fill instead of initialFill to avoid
      // confusion when passing down props from top parent
      fill: this.props.fill
    };
  },

  render:function() {

    var props = this.props;
    
    return (
      React.createElement(Arc, React.__spread({},  
        this.props, 
        {fill: this.state.fill, 
        handleMouseOver: props.hoverAnimation ? this._animateArc : null, 
        handleMouseLeave: props.hoverAnimation ? this._restoreArc : null})
      )
    );
  },

  _animateArc:function() {
    this.setState({
      fill: shade(this.props.fill, 0.2)
    });
  },

  _restoreArc:function() {
    this.setState({
      fill: this.props.fill
    });
  }
});

},{"../utils":68,"./Arc":53,"react":undefined}],55:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var ArcContainer = require('./ArcContainer');


module.exports = React.createClass({

  displayName: 'DataSeries',

  propTypes: {
    data:              React.PropTypes.array,
    values:            React.PropTypes.array,
    labels:            React.PropTypes.array,
    transform:         React.PropTypes.string,
    innerRadius:       React.PropTypes.number,
    radius:            React.PropTypes.number,
    colors:            React.PropTypes.func,
    colorAccessor:     React.PropTypes.func,
    showInnerLabels:   React.PropTypes.bool,
    showOuterLabels:   React.PropTypes.bool,
    sectorBorderColor: React.PropTypes.string
  },

  getDefaultProps:function() {
    return {
      data:          [],
      innerRadius:   0,
      colors:        d3.scale.category20c(),
      colorAccessor: function(d, idx)  {return idx;}
    };
  },

  render:function() {

    var props = this.props;

    var pie = d3.layout
      .pie()
      .sort(null);

    var arcData = pie(props.values);

    var arcs = arcData.map(function(arc, idx)  {
      return (
        React.createElement(ArcContainer, {
          key: idx, 
          startAngle: arc.startAngle, 
          endAngle: arc.endAngle, 
          outerRadius: props.radius, 
          innerRadius: props.innerRadius, 
          labelTextFill: props.labelTextFill, 
          valueTextFill: props.valueTextFill, 
          valueTextFormatter: props.valueTextFormatter, 
          fill: props.colors(props.colorAccessor(props.data[idx], idx)), 
          value: props.values[idx], 
          label: props.labels[idx], 
          width: props.width, 
          showInnerLabels: props.showInnerLabels, 
          showOuterLabels: props.showOuterLabels, 
          sectorBorderColor: props.sectorBorderColor, 
          hoverAnimation: props.hoverAnimation}
        )
      );
    });
    return (
      React.createElement("g", {className: "rd3-piechart-pie", transform: props.transform}, 
        arcs
      )
    );
  }
});

},{"./ArcContainer":54,"d3":5,"react":undefined}],56:[function(require,module,exports){
'use strict';

var d3 = require('d3');
var React = require('react');
var DataSeries = require('./DataSeries');
var Chart = require('../common').Chart;

module.exports = React.createClass({

  displayName: 'PieChart',

  propTypes: {
    data:               React.PropTypes.array,
    radius:             React.PropTypes.number,
    cx:                 React.PropTypes.number,
    cy:                 React.PropTypes.number,
    labelTextFill:      React.PropTypes.string,
    valueTextFill:      React.PropTypes.string,
    valueTextFormatter: React.PropTypes.func,
    colors:             React.PropTypes.func,
    colorAccessor:      React.PropTypes.func,
    title:              React.PropTypes.string,
    showInnerLabels:    React.PropTypes.bool,
    showOuterLabels:    React.PropTypes.bool,
    sectorBorderColor:  React.PropTypes.string,
    hoverAnimation:     React.PropTypes.bool
  },

  getDefaultProps: function() {
    return {
      data:               [],
      title:              '',
      colors:             d3.scale.category20c(),
      colorAccessor:      function(d, idx)  {return idx;},
      valueTextFormatter: function(val)  {return ( val + "%");},
      hoverAnimation:     true
    };
  },

  render: function() {
    var props = this.props;

    var transform = ("translate(" + ( props.cx || props.width/2) + "," + ( props.cy || props.height/2) + ")");

    var values = props.data.map( function(item)  {return item.value;} );
    var labels = props.data.map( function(item)  {return item.label;} );

    return (
      React.createElement(Chart, {
        width: props.width, 
        height: props.height, 
        title: props.title
      }, 
        React.createElement("g", {className: "rd3-piechart"}, 
          React.createElement(DataSeries, {
            labelTextFill: props.labelTextFill, 
            valueTextFill: props.valueTextFill, 
            valueTextFormatter: props.valueTextFormatter, 
            data: props.data, 
            values: values, 
            labels: labels, 
            colors: props.colors, 
            colorAccessor: props.colorAccessor, 
            transform: transform, 
            width: props.width, 
            height: props.height, 
            radius: props.radius, 
            innerRadius: props.innerRadius, 
            showInnerLabels: props.showInnerLabels, 
            showOuterLabels: props.showOuterLabels, 
            sectorBorderColor: props.sectorBorderColor, 
            hoverAnimation: props.hoverAnimation}
          )
        )
      )
    );
  }

});

},{"../common":42,"./DataSeries":55,"d3":5,"react":undefined}],57:[function(require,module,exports){

exports.PieChart = require('./PieChart');

},{"./PieChart":56}],58:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var VoronoiCircleContainer = require('./VoronoiCircleContainer');

module.exports = React.createClass({

  displayName: 'DataSeries',

  propTypes: {
    circleRadius:  React.PropTypes.number.isRequired,
    className:     React.PropTypes.string,
    colors:        React.PropTypes.func.isRequired,
    colorAccessor: React.PropTypes.func.isRequired,
    data:          React.PropTypes.array.isRequired,
    height:        React.PropTypes.number.isRequired,
    xAccessor:     React.PropTypes.func.isRequired,
    xScale:        React.PropTypes.func.isRequired,
    yAccessor:     React.PropTypes.func.isRequired,
    yScale:        React.PropTypes.func.isRequired
  },

  getDefaultProps:function() {
    return {
      className: 'rd3-scatterchart-dataseries'
    };
  },

  render: function() {
    var props     = this.props;
    var xScale    = props.xScale;
    var yScale    = props.yScale;
    var xAccessor = props.xAccessor;
    var yAccessor = props.yAccessor;

    var voronoi = d3.geom.voronoi()
      .x(function(d){ return xScale(d.coord.x); })
      .y(function(d){ return yScale(d.coord.y); })
      .clipExtent([[0, 0], [ props.width , props.height]]);

    var regions = voronoi(props.data).map(function(vnode, idx) {
      var point = vnode.point;
      var coord = point.coord;

      var x = xAccessor(coord);
      var y = yAccessor(coord);

      // The circle coordinates
      var cx, cy;

      if (Object.prototype.toString.call(x) === '[object Date]') {
        cx = xScale(x.getTime());
      } else {
        cx = xScale(x);
      }

      if (Object.prototype.toString.call(y) === '[object Date]') {
        cy = yScale(y.getTime());
      } else {
        cy = yScale(y);
      }

      return (
        React.createElement(VoronoiCircleContainer, {
          key: idx, 
          circleFill: props.colors(props.colorAccessor(point.d, point.seriesIndex)), 
          circleRadius: props.circleRadius, 
          cx: cx, 
          cy: cy, 
          vnode: vnode}
        )
      );
    });

    return (
      React.createElement("g", {
        className: props.className
      }, 
        regions
      )
    );
  }

});

},{"./VoronoiCircleContainer":61,"d3":5,"react":undefined}],59:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var $__0=      require('../common'),Chart=$__0.Chart,XAxis=$__0.XAxis,YAxis=$__0.YAxis;
var DataSeries = require('./DataSeries');
var utils = require('../utils');
var $__1=     require('../mixins'),CartesianChartPropsMixin=$__1.CartesianChartPropsMixin,ViewBoxMixin=$__1.ViewBoxMixin;

module.exports = React.createClass({

  mixins: [ CartesianChartPropsMixin, ViewBoxMixin ],

  displayName: 'ScatterChart',

  propTypes: {
    circleRadius:     React.PropTypes.number,
    className:        React.PropTypes.string,
    hoverAnimation:   React.PropTypes.bool,
    margins:          React.PropTypes.object,
    xAxisClassName:   React.PropTypes.string,
    xAxisStrokeWidth: React.PropTypes.number,
    yAxisClassName:   React.PropTypes.string,
    yAxisStrokeWidth: React.PropTypes.number
 },

  getDefaultProps:function() {
    return {
      circleRadius:     3,
      className:        'rd3-scatterchart',
      hoverAnimation:   true,
      margins:          {top: 10, right: 20, bottom: 50, left: 45},
      xAxisClassName:   'rd3-scatterchart-xaxis',
      xAxisStrokeWidth: 1,
      yAxisClassName:   'rd3-scatterchart-yaxis',
      yAxisStrokeWidth: 1
    };
  },

  _calculateScales: utils.calculateScales,

  render:function() {

    var props = this.props;
    var data  = props.data;
    var margins = props.margins;

    if (!data || data.length < 1) {
      return null;
    }

    // Calculate inner chart dimensions
    var innerWidth  = this.getOuterDimensions().width - margins.left - margins.right;
    var innerHeight = this.getOuterDimensions().height - margins.top - margins.bottom;

    // Returns an object of flattened allValues, xValues, and yValues
    var flattenedData = utils.flattenData(data, props.xAccessor, props.yAccessor);

    var allValues = flattenedData.allValues,
        xValues   = flattenedData.xValues,
        yValues   = flattenedData.yValues;

    var scales  = this._calculateScales(innerWidth, innerHeight, xValues, yValues);
    var xScale  = scales.xScale;
    var yScale  = scales.yScale;

    var x = props.yAxisOffset < 0 ? (margins.left + Math.abs(props.yAxisOffset)) : margins.left;
    var transform = ("translate(" + x + ", " + margins.top + ")");

    return (
      React.createElement(Chart, {
        colors: props.colors, 
        colorAccessor: props.colorAccessor, 
        data: data, 
        height: props.height, 
        legend: props.legend, 
        margins: margins, 
        title: props.title, 
        viewBox: this.getViewBox(), 
        width: props.width
      }, 
        React.createElement("g", {
          className: props.className, 
          transform: transform
        }, 
          React.createElement(XAxis, {
            data: data, 
            height: innerHeight, 
            margins: margins, 
            stroke: props.axesColor, 
            strokeWidth: props.xAxisStrokeWidth.toString(), 
            tickFormatting: props.xAxisFormatter, 
            width: innerWidth, 
            xAxisClassName: props.xAxisClassName, 
            xAxisLabel: props.xAxisLabel, 
            xAxisLabelOffset: props.xAxisLabelOffset, 
            xAxisOffset: props.xAxisOffset, 
            xAxisTickInterval: props.xAxisTickInterval, 
            xAxisTickValues: props.xAxisTickValues, 
            xOrient: props.xOrient, 
            yOrient: props.yOrient, 
            xScale: xScale, 
            gridVertical: props.gridVertical, 
            gridVerticalStroke: props.gridVerticalStroke, 
            gridVerticalStrokeWidth: props.gridVerticalStrokeWidth, 
            gridVerticalStrokeDash: props.gridVerticalStrokeDash}
          ), 
          React.createElement(YAxis, {
            data: data, 
            width: innerWidth, 
            height: innerHeight, 
            margins: margins, 
            stroke: props.axesColor, 
            strokeWidth: props.yAxisStrokeWidth.toString(), 
            tickFormatting: props.yAxisFormatter, 
            yAxisClassName: props.yAxisClassName, 
            yAxisLabel: props.yAxisLabel, 
            yAxisLabelOffset: props.yAxisLabelOffset, 
            yAxisOffset: props.yAxisOffset, 
            yAxisTickValues: props.yAxisTickValues, 
            yAxisTickCount: props.yAxisTickCount, 
            yScale: yScale, 
            xOrient: props.xOrient, 
            yOrient: props.yOrient, 
            gridHorizontal: props.gridHorizontal, 
            gridHorizontalStroke: props.gridHorizontalStroke, 
            gridHorizontalStrokeWidth: props.gridHorizontalStrokeWidth, 
            gridHorizontalStrokeDash: props.gridHorizontalStrokeDash}
          ), 
          React.createElement(DataSeries, {
            circleRadius: props.circleRadius, 
            colors: props.colors, 
            colorAccessor: props.colorAccessor, 
            data: allValues, 
            height: innerHeight, 
            hoverAnimation: props.hoverAnimation, 
            width: innerWidth, 
            xAccessor: props.xAccessor, 
            xScale: xScale, 
            yAccessor: props.yAccessor, 
            yScale: yScale}
            )
        )
      )
    );
  }

});

},{"../common":42,"../mixins":52,"../utils":68,"./DataSeries":58,"d3":5,"react":undefined}],60:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');

module.exports = React.createClass({

  displayName: 'VoronoiCircle',

  propTypes: {
    circleFill:       React.PropTypes.string.isRequired,
    circleRadius:     React.PropTypes.number.isRequired,
    className:        React.PropTypes.string,
    cx:               React.PropTypes.number.isRequired,
    cy:               React.PropTypes.number.isRequired,
    handleMouseLeave: React.PropTypes.func.isRequired,
    handleMouseOver:  React.PropTypes.func.isRequired,
    pathFill:         React.PropTypes.string,
    voronoiPath:      React.PropTypes.string.isRequired
  },

  getDefaultProps:function() {
    return {
      className:    'rd3-scatterchart-voronoi-circle',
      pathFill:     'transparent'
    };
  },

  render:function() {
    var props = this.props;

    return (
      React.createElement("g", null, 
        React.createElement("path", {
          d: props.voronoiPath, 
          fill: props.pathFill, 
          onMouseLeave: props.handleMouseLeave, 
          onMouseOver: props.handleMouseOver}
        ), 
        React.createElement("circle", {
          cx: props.cx, 
          cy: props.cy, 
          className: props.className, 
          fill: props.circleFill, 
          onMouseLeave: props.handleMouseLeave, 
          onMouseOver: props.handleMouseOver, 
          r: props.circleRadius}
        )
      )
    );
  },
});

},{"d3":5,"react":undefined}],61:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var shade = require('../utils').shade;
var VoronoiCircle = require('./VoronoiCircle');

module.exports = React.createClass({

  displayName: 'VornoiCircleContainer',

  propTypes: {
    circleFill:             React.PropTypes.string,
    circleRadius:           React.PropTypes.number,
    circleRadiusMultiplier: React.PropTypes.number,
    className:              React.PropTypes.string,
    hoverAnimation:         React.PropTypes.bool,
    shadeMultiplier:        React.PropTypes.number,
    vnode:                  React.PropTypes.array.isRequired
  },

  getDefaultProps:function() {
    return {
      circleFill:             '#1f77b4',
      circleRadius:           3,
      circleRadiusMultiplier: 1.25,
      className:              'rd3-scatterchart-voronoi-circle-container',
      hoverAnimation:         true,
      shadeMultiplier:        0.2
    };
  },

  getInitialState:function() {
    return {
      circleFill:   this.props.circleFill,
      circleRadius: this.props.circleRadius
    };
  },

  componentWillReceiveProps:function(nextProps) {
    this.setState({
      circleFill:   nextProps.circleFill,
      circleRadius: nextProps.circleRadius
    });
  },

  render:function() {

    var props = this.props;
    var state = this.state;

    return (
      React.createElement("g", {
        className: props.className
      }, 
        React.createElement(VoronoiCircle, {
          circleFill: state.circleFill, 
          circleRadius: state.circleRadius, 
          cx: props.cx, 
          cy: props.cy, 
          handleMouseLeave: this._restoreCircle, 
          handleMouseOver: this._animateCircle, 
          voronoiPath: this._drawPath(props.vnode)}
        )
      )
    );
  },

  _animateCircle:function() {
    var props = this.props;

    if(props.hoverAnimation) {
      this.setState({
        circleFill:   shade(props.circleFill, props.shadeMultiplier),
        circleRadius: props.circleRadius * props.circleRadiusMultiplier
      });
    }
  },

  _restoreCircle:function() {
    var props = this.props;

    if(props.hoverAnimation) {
      this.setState({
        circleFill:   props.circleFill,
        circleRadius: props.circleRadius
      });
    }
  },

  _drawPath: function(d) {
    if(typeof d === 'undefined') {
      return 'M Z';
    }

    return 'M' + d.join(',') + 'Z';
  },
});

},{"../utils":68,"./VoronoiCircle":60,"d3":5,"react":undefined}],62:[function(require,module,exports){

exports.ScatterChart = require('./ScatterChart');

},{"./ScatterChart":59}],63:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');


module.exports = React.createClass({

  displayName: 'Cell',

  propTypes: {
    fill: React.PropTypes.string,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
    label: React.PropTypes.string
  },

  render:function() {

    var props = this.props;
    
    var textStyle = {
      'textAnchor': 'middle',
      'fill': props.textColor,
      'fontSize': props.fontSize
    };

    var t = ("translate(" + props.x + ", " + props.y + "  )");

    return (
      React.createElement("g", {transform: t}, 
        React.createElement("rect", {
          className: "rd3-treemap-cell", 
          width: props.width, 
          height: props.height, 
          fill: props.fill, 
          onMouseOver: props.handleMouseOver, 
          onMouseLeave: props.handleMouseLeave}
        ), 
        React.createElement("text", {
          x: props.width / 2, 
          y: props.height / 2, 
          dy: ".35em", 
          style: textStyle, 
          className: "rd3-treemap-cell-text"
        }, 
          props.label
        )
      )
    );
  }
});

},{"d3":5,"react":undefined}],64:[function(require,module,exports){
'use strict';

var React = require('react');
var shade = require('../utils').shade;
var Cell = require('./Cell');


module.exports = React.createClass({

  displayName: 'CellContainer',

  propTypes: {
    fill: React.PropTypes.string,
  },

  getInitialState:function() {
    return {
      // fill is named as fill instead of initialFill to avoid
      // confusion when passing down props from top parent
      fill: this.props.fill
    };
  },


  render:function() {

    var props = this.props;

    return (
      React.createElement(Cell, React.__spread({},  
        props, 
        {fill: this.state.fill, 
        handleMouseOver: props.hoverAnimation ? this._animateCell : null, 
        handleMouseLeave: props.hoverAnimation ? this._restoreCell : null})
      )
    );
  },

  _animateCell:function() {
    this.setState({
      fill: shade(this.props.fill, 0.05)
    });
  },

  _restoreCell:function() {
    this.setState({
      fill: this.props.fill
    });
  }
});

},{"../utils":68,"./Cell":63,"react":undefined}],65:[function(require,module,exports){
'use strict';

var React = require('react');
var d3 = require('d3');
var CellContainer = require('./CellContainer');


module.exports = React.createClass({

  displayName: 'DataSeries',

  propTypes: {
    data:          React.PropTypes.array,
    colors:        React.PropTypes.func,
    colorAccessor: React.PropTypes.func,
    width:         React.PropTypes.number,
    height:        React.PropTypes.number
  },

  getDefaultProps:function() {
    return {
      data:          [],
      colors:        d3.scale.category20c(),
      colorAccessor: function(d, idx)  {return idx;}
    };
  },

  render:function() {

    var props = this.props;

    var treemap = d3.layout.treemap()
                    // make sure calculation loop through all objects inside array
                    .children( function(d)  {return d;})
                    .size([props.width, props.height])
                    .sticky(true)
                    .value( function(d)  { return d.value; });

    var tree = treemap(props.data);

    var cells = tree.map( function(node, idx)  {
      return (
        React.createElement(CellContainer, {
          key: idx, 
          x: node.x, 
          y: node.y, 
          width: node.dx, 
          height: node.dy, 
          fill: props.colors(props.colorAccessor(node, idx)), 
          label: node.label, 
          fontSize: props.fontSize, 
          textColor: props.textColor, 
          hoverAnimation: props.hoverAnimation}
        )
      );
    }, this);

    return (
      React.createElement("g", {transform: props.transform, className: "treemap"}, 
        cells
      )
    );
  }

});

},{"./CellContainer":64,"d3":5,"react":undefined}],66:[function(require,module,exports){
'use strict';

var d3 = require('d3');
var React = require('react');
var Chart = require('../common').Chart;
var DataSeries = require('./DataSeries');

module.exports = React.createClass({

  displayName: 'Treemap',

  propTypes: {
    data:           React.PropTypes.array,
    margins:        React.PropTypes.object,
    width:          React.PropTypes.number,
    height:         React.PropTypes.number,
    title:          React.PropTypes.string,
    textColor:      React.PropTypes.string,
    fontSize:       React.PropTypes.oneOfType([
                      React.PropTypes.string,
                      React.PropTypes.number
                    ]),
    colors:         React.PropTypes.func,
    colorAccessor:  React.PropTypes.func,
    hoverAnimation: React.PropTypes.bool
  },

  getDefaultProps:function() {
    return {
      hoverAnimation: true,
      data:           [],
      width:          400,
      heigth:         200,
      title:          '',
      textColor:      '#f7f7f7',
      fontSize:       '0.85em',
      colors:         d3.scale.category20c(),
      colorAccessor:  function(d, idx)  {return idx;},
    };
  },

  render:function() {

    var props = this.props;

    return (
      React.createElement(Chart, {
        title: props.title, 
        width: props.width, 
        height: props.height
      }, 
        React.createElement("g", {className: "rd3-treemap"}, 
          React.createElement(DataSeries, {
            data: props.data, 
            width: props.width, 
            height: props.height, 
            colors: props.colors, 
            colorAccessor: props.colorAccessor, 
            textColor: props.textColor, 
            fontSize: props.fontSize, 
            hoverAnimation: props.hoverAnimation}
          )
        )
      )
    );
  }

});

},{"../common":42,"./DataSeries":65,"d3":5,"react":undefined}],67:[function(require,module,exports){

exports.Treemap = require('./Treemap');

},{"./Treemap":66}],68:[function(require,module,exports){
var d3 = require('d3');


exports.calculateScales = function(chartWidth, chartHeight, xValues, yValues)  {

  var xScale, yScale;

  if (xValues.length > 0 && Object.prototype.toString.call(xValues[0]) === '[object Date]') {
    xScale = d3.time.scale()
      .range([0, chartWidth]);
  } else {
    xScale = d3.scale.linear()
      .range([0, chartWidth]);
  }
  xScale.domain(d3.extent(xValues));

  if (yValues.length > 0 && Object.prototype.toString.call(yValues[0]) === '[object Date]') {
    yScale = d3.time.scale()
      .range([chartHeight, 0]);
  } else {
    yScale = d3.scale.linear()
      .range([chartHeight, 0]);
  }

  yScale.domain(d3.extent(yValues));

  return {
    xScale: xScale,
    yScale: yScale
  };

};

// debounce from Underscore.js
// MIT License: https://raw.githubusercontent.com/jashkenas/underscore/master/LICENSE
// Copyright (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative
// Reporters & Editors
exports.debounce = function(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

exports.flattenData = function(data, xAccessor, yAccessor)  {

  var allValues = [];
  var xValues = [];
  var yValues = [];
  var coincidentCoordinateCheck = {};

  data.forEach( function(series, i)  {
    series.values.forEach( function(item, j)  {

      var x = xAccessor(item);

      // Check for NaN since d3's Voronoi cannot handle NaN values
      // Go ahead and Proceed to next iteration since we don't want NaN
      // in allValues or in xValues or yValues
      if (isNaN(x)) {
        return;
      }
      xValues.push(x);

      var y = yAccessor(item);
      // when yAccessor returns an object (as in the case of candlestick)
      // iterate over the keys and push all the values to yValues array
      var yNode;
      if (typeof y === 'object' && Object.keys(y).length > 0) {
        Object.keys(y).forEach(function (key) {
          // Check for NaN since d3's Voronoi cannot handle NaN values
          // Go ahead and Proceed to next iteration since we don't want NaN
          // in allValues or in xValues or yValues
          if (isNaN(y[key])) {
            return;
          }
          yValues.push(y[key]);
          // if multiple y points are to be plotted for a single x
          // as in the case of candlestick, default to y value of 0
          yNode = 0;
        });
      } else {
        // Check for NaN since d3's Voronoi cannot handle NaN values
        // Go ahead and Proceed to next iteration since we don't want NaN
        // in allValues or in xValues or yValues
        if (isNaN(y)) {
          return;
        }
        yValues.push(y);
        yNode = y;
      }

      var xyCoords = (x + "-" + yNode);
      if (coincidentCoordinateCheck.hasOwnProperty(xyCoords)) {
        // Proceed to next iteration if the x y pair already exists
        // d3's Voronoi cannot handle NaN values or coincident coords
        // But we push them into xValues and yValues above because
        // we still may handle them there (labels, etc.)
        return;
      }
      coincidentCoordinateCheck[xyCoords] = '';

      var pointItem = {
        coord: {
          x: x,
          y: yNode,
        },
        d: item,
        id: series.name + j,
        series: series,
        seriesIndex: i
      };
      allValues.push(pointItem);
    });
  });

  return {
    allValues: allValues,
    xValues: xValues,
    yValues: yValues
  };
};


exports.shade = function(hex, percent)  {

  var R, G, B, red, green, blue, number;
  var min = Math.min, round = Math.round;
  if(hex.length !== 7) { return hex; }
  number = parseInt(hex.slice(1), 16);
  R = number >> 16;
  G = number >> 8 & 0xFF;
  B = number & 0xFF;
  red = min( 255, round( ( 1 + percent ) * R )).toString(16);
  if (red.length === 1) red = '0' + red;
  green = min( 255, round( ( 1 + percent ) * G )).toString(16);
  if (green.length === 1) green = '0' + green;
  blue = min( 255, round( ( 1 + percent ) * B )).toString(16);
  if (blue.length === 1) blue = '0' + blue;
  return ("#" +  red +  green +  blue);

};

},{"d3":5}],69:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var ErrorView = _react2['default'].createClass({
	displayName: 'ErrorView',

	propTypes: {
		children: _react2['default'].PropTypes.node
	},

	render: function render() {
		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ fill: true, className: 'View ErrorView' },
			this.props.children
		);
	}
});

exports['default'] = ErrorView;
module.exports = exports['default'];
},{"react":undefined,"react-container":undefined}],70:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var _mixinsTransitions = require('../mixins/Transitions');

var _mixinsTransitions2 = _interopRequireDefault(_mixinsTransitions);

var Link = _react2['default'].createClass({
	displayName: 'Link',

	mixins: [_mixinsTransitions2['default']],
	propTypes: {
		children: _react2['default'].PropTypes.any,
		options: _react2['default'].PropTypes.object,
		transition: _react2['default'].PropTypes.string,
		to: _react2['default'].PropTypes.string,
		viewProps: _react2['default'].PropTypes.any
	},

	doTransition: function doTransition() {
		var options = _extends({ viewProps: this.props.viewProps, transition: this.props.transition }, this.props.options);
		console.info('Link to "' + this.props.to + '" using transition "' + this.props.transition + '"' + ' with props ', this.props.viewProps);
		this.transitionTo(this.props.to, options);
	},

	render: function render() {
		var tappableProps = (0, _blacklist2['default'])(this.props, 'children', 'options', 'transition', 'viewProps');

		return _react2['default'].createElement(
			_reactTappable2['default'],
			_extends({ onTap: this.doTransition }, tappableProps),
			this.props.children
		);
	}
});

exports['default'] = Link;
module.exports = exports['default'];
},{"../mixins/Transitions":75,"blacklist":2,"react":undefined,"react-tappable":undefined}],71:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var View = _react2['default'].createClass({
	displayName: 'View',

	propTypes: {
		component: _react2['default'].PropTypes.func.isRequired,
		name: _react2['default'].PropTypes.string.isRequired
	},
	render: function render() {
		throw new Error('TouchstoneJS <View> should not be rendered directly.');
	}
});

exports['default'] = View;
module.exports = exports['default'];
},{"react":undefined}],72:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _ErrorView = require('./ErrorView');

var _ErrorView2 = _interopRequireDefault(_ErrorView);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactAddonsCssTransitionGroup = require('react-addons-css-transition-group');

var _reactAddonsCssTransitionGroup2 = _interopRequireDefault(_reactAddonsCssTransitionGroup);

function createViewsFromChildren(children) {
	var views = {};
	_react2['default'].Children.forEach(children, function (view) {
		views[view.props.name] = view;
	});
	return views;
}

var ViewContainer = _react2['default'].createClass({
	displayName: 'ViewContainer',

	statics: {
		shouldFillVerticalSpace: true
	},
	propTypes: {
		children: _react2['default'].PropTypes.node
	},
	render: function render() {
		var props = (0, _blacklist2['default'])(this.props, 'children');
		return _react2['default'].createElement(
			'div',
			props,
			this.props.children
		);
	}
});

var ViewManager = _react2['default'].createClass({
	displayName: 'ViewManager',

	statics: {
		shouldFillVerticalSpace: true
	},
	contextTypes: {
		app: _react2['default'].PropTypes.object.isRequired
	},
	propTypes: {
		name: _react2['default'].PropTypes.string,
		children: _react2['default'].PropTypes.node,
		className: _react2['default'].PropTypes.string,
		defaultView: _react2['default'].PropTypes.string,
		onViewChange: _react2['default'].PropTypes.func
	},
	getDefaultProps: function getDefaultProps() {
		return {
			name: '__default'
		};
	},
	getInitialState: function getInitialState() {
		return {
			views: createViewsFromChildren(this.props.children),
			currentView: this.props.defaultView,
			options: {}
		};
	},
	componentDidMount: function componentDidMount() {
		this.context.app.viewManagers[this.props.name] = this;
	},
	componentWillUnmount: function componentWillUnmount() {
		delete this.context.app.viewManagers[this.props.name];
	},
	componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
		this.setState({
			views: createViewsFromChildren(this.props.children)
		});
		if (nextProps.name !== this.props.name) {
			this.context.app.viewManagers[nextProps.name] = this;
			delete this.context.app.viewManagers[this.props.name];
		}
		if (nextProps.currentView && nextProps.currentView !== this.state.currentView) {
			this.transitionTo(nextProps.currentView, { viewProps: nextProps.viewProps });
		}
	},
	transitionTo: function transitionTo(viewKey, options) {
		var _this = this;

		if (typeof options === 'string') {
			options = { transition: options };
		}
		if (!options) options = {};
		this.activeTransitionOptions = options;
		this.context.app.viewManagerInTransition = this;
		this.props.onViewChange && this.props.onViewChange(viewKey);
		this.setState({
			currentView: viewKey,
			options: options
		}, function () {
			delete _this.activeTransitionOptions;
			delete _this.context.app.viewManagerInTransition;
		});
	},
	renderViewContainer: function renderViewContainer() {
		var viewKey = this.state.currentView;
		if (!viewKey) {
			return _react2['default'].createElement(
				_ErrorView2['default'],
				null,
				_react2['default'].createElement(
					'span',
					{ className: 'ErrorView__heading' },
					'ViewManager: ',
					this.props.name
				),
				_react2['default'].createElement(
					'span',
					{ className: 'ErrorView__text' },
					'Error: There is no current View.'
				)
			);
		}
		var view = this.state.views[viewKey];
		if (!view || !view.props.component) {
			return _react2['default'].createElement(
				_ErrorView2['default'],
				null,
				_react2['default'].createElement(
					'span',
					{ className: 'ErrorView__heading' },
					'ViewManager: "',
					this.props.name,
					'"'
				),
				_react2['default'].createElement(
					'span',
					{ className: 'ErrorView__text' },
					'The View "',
					viewKey,
					'" is invalid.'
				)
			);
		}
		var options = this.state.options || {};
		var viewClassName = (0, _classnames2['default'])('View View--' + viewKey, view.props.className);
		var ViewComponent = view.props.component;
		var viewProps = (0, _blacklist2['default'])(view.props, 'component', 'className');
		_extends(viewProps, options.viewProps);
		var viewElement = _react2['default'].createElement(ViewComponent, viewProps);

		if (this.__lastRenderedView !== viewKey) {
			// console.log('initialising view ' + viewKey + ' with options', options);
			if (viewElement.type.navigationBar && viewElement.type.getNavigation) {
				var app = this.context.app;
				var transition = options.transition;
				if (app.viewManagerInTransition) {
					transition = app.viewManagerInTransition.activeTransitionOptions.transition;
				}
				setTimeout(function () {
					app.navigationBars[viewElement.type.navigationBar].updateWithTransition(viewElement.type.getNavigation(viewProps, app), transition);
				}, 0);
			}
			this.__lastRenderedView = viewKey;
		}

		return _react2['default'].createElement(
			ViewContainer,
			{ className: viewClassName, key: viewKey },
			viewElement
		);
	},
	render: function render() {
		var className = (0, _classnames2['default'])('ViewManager', this.props.className);
		var viewContainer = this.renderViewContainer(this.state.currentView, { viewProps: this.state.currentViewProps });

		var transitionName = 'view-transition-instant';
		var transitionDurationEnter = 10;
		var transitionDurationLeave = 60;
		if (this.state.options.transition) {
			// console.log('applying view transition: ' + this.state.options.transition + ' to view ' + this.state.currentView);
			transitionName = 'view-transition-' + this.state.options.transition;
			if (this.state.options.transition === 'fade') {
				var transitionDurationEnter = 10;
				var transitionDurationLeave = 340;
			} else {
				var transitionDurationEnter = 500;
				var transitionDurationLeave = 500;
			}
		}
		return _react2['default'].createElement(
			_reactAddonsCssTransitionGroup2['default'],
			{ transitionName: transitionName, transitionEnterTimeout: transitionDurationEnter, transitionLeaveTimeout: transitionDurationLeave, className: className, component: 'div' },
			viewContainer
		);
	}
});

exports['default'] = ViewManager;
module.exports = exports['default'];
},{"./ErrorView":69,"blacklist":2,"classnames":4,"react":undefined,"react-addons-css-transition-group":undefined}],73:[function(require,module,exports){
'use strict';

var animation = require('tween.js');

function update() {
	animation.update();
	if (animation.getAll().length) {
		window.requestAnimationFrame(update);
	}
}

function scrollToTop(el, options) {
	options = options || {};
	var from = el.scrollTop;
	var duration = Math.min(Math.max(200, from / 2), 350);
	if (from > 200) duration = 300;
	el.style.webkitOverflowScrolling = 'auto';
	el.style.overflow = 'hidden';
	var tween = new animation.Tween({ pos: from }).to({ pos: 0 }, duration).easing(animation.Easing.Quadratic.Out).onUpdate(function () {
		el.scrollTop = this.pos;
		if (options.onUpdate) {
			options.onUpdate();
		}
	}).onComplete(function () {
		el.style.webkitOverflowScrolling = 'touch';
		el.style.overflow = 'scroll';
		if (options.onComplete) options.onComplete();
	}).start();
	update();
	return tween;
}

exports.scrollToTop = scrollToTop;

var Mixins = exports.Mixins = {};

Mixins.ScrollContainerToTop = {
	componentDidMount: function componentDidMount() {
		window.addEventListener('statusTap', this.scrollContainerToTop);
	},
	componentWillUnmount: function componentWillUnmount() {
		window.removeEventListener('statusTap', this.scrollContainerToTop);
		if (this._scrollContainerAnimation) {
			this._scrollContainerAnimation.stop();
		}
	},
	scrollContainerToTop: function scrollContainerToTop() {
		var _this = this;

		if (!this.isMounted() || !this.refs.scrollContainer) return;
		this._scrollContainerAnimation = scrollToTop(this.refs.scrollContainer, {
			onComplete: function onComplete() {
				delete _this._scrollContainerAnimation;
			}
		});
	}
};
},{"tween.js":113}],74:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports.createApp = createApp;
var React = require('react');

var animation = require('./core/animation');
exports.animation = animation;
var Link = require('./core/Link');
exports.Link = Link;
var View = require('./core/View');
exports.View = View;
var ViewManager = require('./core/ViewManager');

exports.ViewManager = ViewManager;
var Container = require('react-container');
exports.Container = Container;
var Mixins = require('./mixins');
exports.Mixins = Mixins;
var UI = require('./ui');

exports.UI = UI;

function createApp() {
	var app = {
		navigationBars: {},
		viewManagers: {},
		transitionTo: function transitionTo(view, opts) {
			var vm = '__default';
			view = view.split(':');
			if (view.length > 1) {
				vm = view.shift();
			}
			view = view[0];
			app.viewManagers[vm].transitionTo(view, opts);
		}
	};
	return {
		childContextTypes: {
			app: React.PropTypes.object
		},
		getChildContext: function getChildContext() {
			return {
				app: app
			};
		}
	};
}
},{"./core/Link":70,"./core/View":71,"./core/ViewManager":72,"./core/animation":73,"./mixins":76,"./ui":111,"react":undefined,"react-container":undefined}],75:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var Transitions = {
	contextTypes: {
		app: _react2['default'].PropTypes.object
	},
	transitionTo: function transitionTo(view, opts) {
		this.context.app.transitionTo(view, opts);
	}
};

exports['default'] = Transitions;
module.exports = exports['default'];
},{"react":undefined}],76:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var Transitions = require('./Transitions');
exports.Transitions = Transitions;
},{"./Transitions":75}],77:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactAddonsCssTransitionGroup = require('react-addons-css-transition-group');

var _reactAddonsCssTransitionGroup2 = _interopRequireDefault(_reactAddonsCssTransitionGroup);

module.exports = _react2['default'].createClass({
	displayName: 'Alertbar',
	propTypes: {
		animated: _react2['default'].PropTypes.bool,
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string,
		pulse: _react2['default'].PropTypes.bool,
		type: _react2['default'].PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'danger']),
		visible: _react2['default'].PropTypes.bool
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Alertbar', 'Alertbar--' + this.props.type, {
			'Alertbar--animated': this.props.animated,
			'Alertbar--pulse': this.props.pulse
		}, this.props.className);

		var pulseWrap = this.props.pulse ? _react2['default'].createElement(
			'div',
			{ className: 'Alertbar__inner' },
			this.props.children
		) : this.props.children;
		var animatedBar = this.props.visible ? _react2['default'].createElement(
			'div',
			{ className: className },
			pulseWrap
		) : null;

		var component = this.props.animated ? _react2['default'].createElement(
			_reactAddonsCssTransitionGroup2['default'],
			{ transitionName: 'Alertbar', transitionEnterTimeout: 300, transitionLeaveTimeout: 300, component: 'div' },
			animatedBar
		) : _react2['default'].createElement(
			'div',
			{ className: className },
			pulseWrap
		);

		return component;
	}
});
},{"classnames":4,"react":undefined,"react-addons-css-transition-group":undefined}],78:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

module.exports = _react2['default'].createClass({
	displayName: 'Button',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string,
		type: _react2['default'].PropTypes.oneOf(['default', 'info', 'primary', 'success', 'warning', 'danger'])
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Button', 'Button--' + this.props.type, this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'type');

		return _react2['default'].createElement(_reactTappable2['default'], _extends({}, props, { className: className, component: 'button' }));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined,"react-tappable":undefined}],79:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ButtonGroup',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('ButtonGroup', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],80:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var i18n = {
	// TODO: use real i18n strings.
	weekdaysMin: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
	months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
	longMonths: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
	formatYearMonth: function formatYearMonth(year, month) {
		return year + ' - ' + (month + 1);
	}
};

function newState(props) {
	var date = props.date || new Date();
	var year = date.getFullYear();
	var month = date.getMonth();
	var ns = {
		mode: 'day',
		year: year,
		month: month,
		day: date.getDate(),
		displayYear: year,
		displayMonth: month,
		displayYearRangeStart: Math.floor(year / 10) * 10
	};
	return ns;
}

module.exports = _react2['default'].createClass({
	displayName: 'DatePicker',
	propTypes: {
		date: _react2['default'].PropTypes.object,
		mode: _react2['default'].PropTypes.oneOf(['day', 'month']),
		onChange: _react2['default'].PropTypes.func
	},

	getDefaultProps: function getDefaultProps() {
		return {
			date: new Date()
		};
	},

	getInitialState: function getInitialState() {
		return newState(this.props);
	},

	componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
		this.setState(newState(nextProps));
	},

	selectDay: function selectDay(year, month, day) {
		this.setState({
			year: year,
			month: month,
			day: day
		});

		if (this.props.onChange) {
			this.props.onChange(new Date(year, month, day));
		}
	},

	selectMonth: function selectMonth(month) {
		this.setState({
			displayMonth: month,
			mode: 'day'
		});
	},

	selectYear: function selectYear(year) {
		this.setState({
			displayYear: year,
			displayYearRangeStart: Math.floor(year / 10) * 10,
			mode: 'month'
		});
	},

	handlerTopBarTitleClick: function handlerTopBarTitleClick() {
		if (this.state.mode === 'day') {
			this.setState({ mode: 'month' });
		} else {
			this.setState({ mode: 'day' });
		}
	},

	handleLeftArrowClick: function handleLeftArrowClick() {
		switch (this.state.mode) {
			case 'day':
				this.goPreviousMonth();
				break;

			case 'month':
				this.goPreviousYearRange();
				break;

			case 'year':
				this.goPreviousYearRange();
				break;
		}
	},

	handleRightArrowClick: function handleRightArrowClick() {
		switch (this.state.mode) {
			case 'day':
				this.goNextMonth();
				break;

			case 'month':
				this.goNextYearRange();
				break;

			case 'year':
				this.goNextYearRange();
				break;
		}
	},

	goPreviousMonth: function goPreviousMonth() {
		if (this.state.displayMonth === 0) {
			this.setState({
				displayMonth: 11,
				displayYear: this.state.displayYear - 1
			});
		} else {
			this.setState({
				displayMonth: this.state.displayMonth - 1
			});
		}
	},

	goNextMonth: function goNextMonth() {
		if (this.state.displayMonth === 11) {
			this.setState({
				displayMonth: 0,
				displayYear: this.state.displayYear + 1
			});
		} else {
			this.setState({
				displayMonth: this.state.displayMonth + 1
			});
		}
	},

	goPreviousYear: function goPreviousYear() {
		this.setState({
			displayYear: this.state.displayYear - 1
		});
	},

	goNextYear: function goNextYear() {
		this.setState({
			displayYear: this.state.displayYear + 1
		});
	},

	goPreviousYearRange: function goPreviousYearRange() {
		this.setState({
			displayYearRangeStart: this.state.displayYearRangeStart - 10
		});
	},

	goNextYearRange: function goNextYearRange() {
		this.setState({
			displayYearRangeStart: this.state.displayYearRangeStart + 10
		});
	},

	renderWeeknames: function renderWeeknames() {
		return i18n.weekdaysMin.map(function (name, i) {
			return _react2['default'].createElement(
				'span',
				{ key: name + i, className: 'week-name' },
				name
			);
		});
	},

	renderDays: function renderDays() {
		var displayYear = this.state.displayYear;
		var displayMonth = this.state.displayMonth;
		var today = new Date();
		var lastDayInMonth = new Date(displayYear, displayMonth + 1, 0);
		var daysInMonth = lastDayInMonth.getDate();
		var daysInPreviousMonth = new Date(displayYear, displayMonth, 0).getDate();
		var startWeekDay = new Date(displayYear, displayMonth, 1).getDay();
		var days = [];
		var i, dm, dy;

		for (i = 0; i < startWeekDay; i++) {
			var d = daysInPreviousMonth - (startWeekDay - 1 - i);
			dm = displayMonth - 1;
			dy = displayYear;
			if (dm === -1) {
				dm = 11;
				dy -= 1;
			}
			days.push(_react2['default'].createElement(
				_reactTappable2['default'],
				{ key: 'p' + i, onTap: this.selectDay.bind(this, dy, dm, d), className: 'day in-previous-month' },
				d
			));
		}

		var inThisMonth = displayYear === today.getFullYear() && displayMonth === today.getMonth();
		var inSelectedMonth = displayYear === this.state.year && displayMonth === this.state.month;
		for (i = 1; i <= daysInMonth; i++) {
			var cssClass = (0, _classnames2['default'])({
				'day': true,
				'is-today': inThisMonth && i === today.getDate(),
				'is-current': inSelectedMonth && i === this.state.day
			});
			days.push(_react2['default'].createElement(
				_reactTappable2['default'],
				{ key: i, onTap: this.selectDay.bind(this, displayYear, displayMonth, i), className: cssClass },
				i
			));
		}

		var c = startWeekDay + daysInMonth;
		for (i = 1; i <= 42 - c; i++) {
			dm = displayMonth + 1;
			dy = displayYear;
			if (dm === 12) {
				dm = 0;
				dy += 1;
			}
			days.push(_react2['default'].createElement(
				_reactTappable2['default'],
				{ key: 'n' + i, onTap: this.selectDay.bind(this, dy, dm, i), className: 'day in-next-month' },
				i
			));
		}

		return days;
	},

	renderMonths: function renderMonths() {
		var _this = this;

		return i18n.months.map(function (name, m) {
			return _react2['default'].createElement(
				_reactTappable2['default'],
				{ key: name + m, className: (0, _classnames2['default'])('month-name', { 'is-current': m === _this.state.displayMonth }),
					onTap: _this.selectMonth.bind(_this, m) },
				name
			);
		});
	},

	renderYears: function renderYears() {
		var years = [];
		for (var i = this.state.displayYearRangeStart - 1; i < this.state.displayYearRangeStart + 11; i++) {
			years.push(_react2['default'].createElement(
				_reactTappable2['default'],
				{ key: i, className: (0, _classnames2['default'])('year', { 'is-current': i === this.state.displayYear }),
					onTap: this.selectYear.bind(this, i) },
				i
			));
		}

		return years;
	},

	render: function render() {
		var topBarTitle = '';
		switch (this.state.mode) {
			case 'day':
				topBarTitle = i18n.formatYearMonth(this.state.displayYear, this.state.displayMonth);
				break;
			case 'month':
				topBarTitle = this.state.displayYearRangeStart + ' - ' + (this.state.displayYearRangeStart + 9);
				break;
		}

		return _react2['default'].createElement(
			'div',
			{ className: (0, _classnames2['default'])('date-picker', 'mode-' + this.state.mode) },
			_react2['default'].createElement(
				'div',
				{ className: 'top-bar' },
				_react2['default'].createElement(_reactTappable2['default'], { className: 'left-arrow', onTap: this.handleLeftArrowClick }),
				_react2['default'].createElement(_reactTappable2['default'], { className: 'right-arrow', onTap: this.handleRightArrowClick }),
				_react2['default'].createElement(
					_reactTappable2['default'],
					{ className: 'top-bar-title', onTap: this.handlerTopBarTitleClick },
					topBarTitle
				)
			),
			this.state.mode === 'day' && [_react2['default'].createElement(
				'div',
				{ key: 'weeknames', className: 'week-names-container' },
				this.renderWeeknames()
			), _react2['default'].createElement(
				'div',
				{ key: 'days', className: 'days-container' },
				this.renderDays()
			)],
			this.state.mode === 'month' && [_react2['default'].createElement(
				'div',
				{ key: 'years', className: 'years-container' },
				this.renderYears()
			), _react2['default'].createElement(
				'div',
				{ key: 'months', className: 'month-names-container' },
				this.renderMonths()
			)]
		);
	}
});
},{"classnames":4,"react":undefined,"react-tappable":undefined}],81:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _DatePicker = require('./DatePicker');

var _DatePicker2 = _interopRequireDefault(_DatePicker);

var _Popup = require('./Popup');

var _Popup2 = _interopRequireDefault(_Popup);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'DatePickerPopup',

	propTypes: {
		className: _react2['default'].PropTypes.string,
		visible: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var className = (0, _classnames2['default'])('DatePicker', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className', 'visible');
		return _react2['default'].createElement(
			_Popup2['default'],
			{ className: className, visible: this.props.visible },
			_react2['default'].createElement(_DatePicker2['default'], props)
		);
	}
});
},{"./DatePicker":80,"./Popup":103,"blacklist":2,"classnames":4,"react":undefined}],82:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'FieldControl',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('FieldControl', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],83:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'FieldLabel',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('FieldLabel', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],84:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'Group',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string,
		hasTopGutter: _react2['default'].PropTypes.bool
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Group', {
			'Group--has-gutter-top': this.props.hasTopGutter
		}, this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],85:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'GroupBody',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Group__body', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],86:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'GroupFooter',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Group__footer', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],87:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'GroupHeader',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Group__header', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],88:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'GroupInner',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Group__inner', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],89:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemContent = require('./ItemContent');

var _ItemContent2 = _interopRequireDefault(_ItemContent);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

// Many input types DO NOT support setSelectionRange.
// Email will show an error on most desktop browsers but works on
// mobile safari + WKWebView, which is really what we care about
var SELECTABLE_INPUT_TYPES = {
	'email': true,
	'password': true,
	'search': true,
	'tel': true,
	'text': true,
	'url': true
};

module.exports = _react2['default'].createClass({
	displayName: 'Input',

	propTypes: {
		autoFocus: _react2['default'].PropTypes.bool,
		className: _react2['default'].PropTypes.string,
		children: _react2['default'].PropTypes.node,
		disabled: _react2['default'].PropTypes.bool
	},

	componentDidMount: function componentDidMount() {
		if (this.props.autoFocus) {
			this.moveCursorToEnd();
		}
	},

	moveCursorToEnd: function moveCursorToEnd() {
		var target = this.refs.focusTarget.getDOMNode();
		var endOfString = target.value.length;

		if (SELECTABLE_INPUT_TYPES.hasOwnProperty(target.type)) {
			target.focus();
			target.setSelectionRange(endOfString, endOfString);
		}
	},

	render: function render() {
		var inputProps = (0, _blacklist2['default'])(this.props, 'children', 'className');

		return _react2['default'].createElement(
			_Item2['default'],
			{ className: this.props.className, selectable: this.props.disabled, component: 'label' },
			_react2['default'].createElement(
				_ItemInner2['default'],
				null,
				_react2['default'].createElement(
					_ItemContent2['default'],
					{ component: 'label' },
					_react2['default'].createElement('input', _extends({ ref: 'focusTarget', className: 'field', type: 'text' }, inputProps))
				),
				this.props.children
			)
		);
	}
});
},{"./Item":90,"./ItemContent":91,"./ItemInner":92,"blacklist":2,"react":undefined}],90:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'Item',

	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		component: _react2['default'].PropTypes.any,
		className: _react2['default'].PropTypes.string,
		showDisclosureArrow: _react2['default'].PropTypes.bool
	},

	getDefaultProps: function getDefaultProps() {
		return {
			component: 'div'
		};
	},

	render: function render() {
		var componentClass = (0, _classnames2['default'])('Item', {
			'Item--has-disclosure-arrow': this.props.showDisclosureArrow
		}, this.props.className);

		var props = (0, _blacklist2['default'])(this.props, 'children', 'className', 'showDisclosureArrow');
		props.className = componentClass;

		return _react2['default'].createElement(this.props.component, props, this.props.children);
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],91:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemContent',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Item__content', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],92:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemInner',

	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Item__inner', this.props.className);

		return _react2['default'].createElement('div', _extends({ className: className }, this.props));
	}
});
},{"classnames":4,"react":undefined}],93:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemMedia',
	propTypes: {
		avatar: _react2['default'].PropTypes.string,
		avatarInitials: _react2['default'].PropTypes.string,
		className: _react2['default'].PropTypes.string,
		icon: _react2['default'].PropTypes.string,
		thumbnail: _react2['default'].PropTypes.string
	},

	render: function render() {
		var className = (0, _classnames2['default'])({
			'Item__media': true,
			'Item__media--icon': this.props.icon,
			'Item__media--avatar': this.props.avatar || this.props.avatarInitials,
			'Item__media--thumbnail': this.props.thumbnail
		}, this.props.className);

		// media types
		var icon = this.props.icon ? _react2['default'].createElement('div', { className: 'Item__media__icon ' + this.props.icon }) : null;
		var avatar = this.props.avatar || this.props.avatarInitials ? _react2['default'].createElement(
			'div',
			{ className: 'Item__media__avatar' },
			this.props.avatar ? _react2['default'].createElement('img', { src: this.props.avatar }) : this.props.avatarInitials
		) : null;
		var thumbnail = this.props.thumbnail ? _react2['default'].createElement(
			'div',
			{ className: 'Item__media__thumbnail' },
			_react2['default'].createElement('img', { src: this.props.thumbnail })
		) : null;

		return _react2['default'].createElement(
			'div',
			{ className: className },
			icon,
			avatar,
			thumbnail
		);
	}
});
},{"classnames":4,"react":undefined}],94:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemNote',
	propTypes: {
		className: _react2['default'].PropTypes.string,
		icon: _react2['default'].PropTypes.string,
		label: _react2['default'].PropTypes.string,
		type: _react2['default'].PropTypes.string
	},
	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Item__note', 'Item__note--' + this.props.type, this.props.className);

		// elements
		var label = this.props.label ? _react2['default'].createElement(
			'div',
			{ className: 'Item__note__label' },
			this.props.label
		) : null;
		var icon = this.props.icon ? _react2['default'].createElement('div', { className: 'Item__note__icon ' + this.props.icon }) : null;

		return _react2['default'].createElement(
			'div',
			{ className: className },
			label,
			icon
		);
	}
});
},{"classnames":4,"react":undefined}],95:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemSubTitle',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Item__subtitle', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],96:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemTitle',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Item__title', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],97:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _FieldControl = require('./FieldControl');

var _FieldControl2 = _interopRequireDefault(_FieldControl);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

// Many input types DO NOT support setSelectionRange.
// Email will show an error on most desktop browsers but works on
// mobile safari + WKWebView, which is really what we care about
var SELECTABLE_INPUT_TYPES = {
	'email': true,
	'password': true,
	'search': true,
	'tel': true,
	'text': true,
	'url': true
};

module.exports = _react2['default'].createClass({
	displayName: 'LabelInput',

	propTypes: {
		alignTop: _react2['default'].PropTypes.bool,
		autoFocus: _react2['default'].PropTypes.bool,
		children: _react2['default'].PropTypes.node,
		className: _react2['default'].PropTypes.string,
		disabled: _react2['default'].PropTypes.bool,
		label: _react2['default'].PropTypes.string,
		readOnly: _react2['default'].PropTypes.bool,
		value: _react2['default'].PropTypes.string
	},

	componentDidMount: function componentDidMount() {
		if (this.props.autoFocus) {
			this.moveCursorToEnd();
		}
	},

	moveCursorToEnd: function moveCursorToEnd() {
		var target = this.refs.focusTarget.getDOMNode();
		var endOfString = target.value.length;

		if (SELECTABLE_INPUT_TYPES.hasOwnProperty(target.type)) {
			target.focus();
			target.setSelectionRange(endOfString, endOfString);
		}
	},

	render: function render() {
		var inputProps = (0, _blacklist2['default'])(this.props, 'alignTop', 'children', 'first', 'readOnly');
		var renderInput = this.props.readOnly ? _react2['default'].createElement(
			'div',
			{ className: 'field u-selectable' },
			this.props.value
		) : _react2['default'].createElement('input', _extends({ ref: 'focusTarget', className: 'field', type: 'text' }, inputProps));

		return _react2['default'].createElement(
			_Item2['default'],
			{ alignTop: this.props.alignTop, selectable: this.props.disabled, className: this.props.className, component: 'label' },
			_react2['default'].createElement(
				_ItemInner2['default'],
				null,
				_react2['default'].createElement(
					_reactTappable2['default'],
					{ onTap: this.moveCursorToEnd, className: 'FieldLabel' },
					this.props.label
				),
				_react2['default'].createElement(
					_FieldControl2['default'],
					null,
					renderInput,
					this.props.children
				)
			)
		);
	}
});
},{"./FieldControl":82,"./Item":90,"./ItemInner":92,"blacklist":2,"react":undefined,"react-tappable":undefined}],98:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _FieldControl = require('./FieldControl');

var _FieldControl2 = _interopRequireDefault(_FieldControl);

var _FieldLabel = require('./FieldLabel');

var _FieldLabel2 = _interopRequireDefault(_FieldLabel);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'LabelSelect',
	propTypes: {
		className: _react2['default'].PropTypes.string,
		disabled: _react2['default'].PropTypes.bool,
		label: _react2['default'].PropTypes.string,
		onChange: _react2['default'].PropTypes.func.isRequired,
		options: _react2['default'].PropTypes.array.isRequired,
		value: _react2['default'].PropTypes.oneOfType([_react2['default'].PropTypes.number, _react2['default'].PropTypes.string])
	},

	getDefaultProps: function getDefaultProps() {
		return {
			className: ''
		};
	},

	renderOptions: function renderOptions() {
		return this.props.options.map(function (op) {
			return _react2['default'].createElement(
				'option',
				{ key: 'option-' + op.value, value: op.value },
				op.label
			);
		});
	},

	render: function render() {
		return _react2['default'].createElement(
			_Item2['default'],
			{ className: this.props.className, component: 'label' },
			_react2['default'].createElement(
				_ItemInner2['default'],
				null,
				_react2['default'].createElement(
					_FieldLabel2['default'],
					null,
					this.props.label
				),
				_react2['default'].createElement(
					_FieldControl2['default'],
					null,
					_react2['default'].createElement(
						'select',
						{ disabled: this.props.disabled, value: this.props.value, onChange: this.props.onChange, className: 'select-field' },
						this.renderOptions()
					),
					_react2['default'].createElement(
						'div',
						{ className: 'select-field-indicator' },
						_react2['default'].createElement('div', { className: 'select-field-indicator-arrow' })
					)
				)
			)
		);
	}
});
},{"./FieldControl":82,"./FieldLabel":83,"./Item":90,"./ItemInner":92,"react":undefined}],99:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'LabelTextarea',

	propTypes: {
		children: _react2['default'].PropTypes.node,
		className: _react2['default'].PropTypes.string,
		disabled: _react2['default'].PropTypes.bool,
		first: _react2['default'].PropTypes.bool,
		label: _react2['default'].PropTypes.string,
		readOnly: _react2['default'].PropTypes.bool,
		value: _react2['default'].PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			rows: 3
		};
	},

	render: function render() {
		var className = (0, _classnames2['default'])(this.props.className, 'list-item', 'field-item', 'align-top', {
			'is-first': this.props.first,
			'u-selectable': this.props.disabled
		});

		var props = (0, _blacklist2['default'])(this.props, 'children', 'className', 'disabled', 'first', 'label', 'readOnly');

		var renderInput = this.props.readOnly ? _react2['default'].createElement(
			'div',
			{ className: 'field u-selectable' },
			this.props.value
		) : _react2['default'].createElement('textarea', _extends({}, props, { className: 'field' }));

		return _react2['default'].createElement(
			'div',
			{ className: className },
			_react2['default'].createElement(
				'label',
				{ className: 'item-inner' },
				_react2['default'].createElement(
					'div',
					{ className: 'field-label' },
					this.props.label
				),
				_react2['default'].createElement(
					'div',
					{ className: 'field-control' },
					renderInput,
					this.props.children
				)
			)
		);
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],100:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _FieldControl = require('./FieldControl');

var _FieldControl2 = _interopRequireDefault(_FieldControl);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'LabelValue',

	propTypes: {
		alignTop: _react2['default'].PropTypes.bool,
		className: _react2['default'].PropTypes.string,
		label: _react2['default'].PropTypes.string,
		placeholder: _react2['default'].PropTypes.string,
		value: _react2['default'].PropTypes.string
	},

	render: function render() {
		return _react2['default'].createElement(
			_Item2['default'],
			{ alignTop: this.props.alignTop, className: this.props.className, component: 'label' },
			_react2['default'].createElement(
				_ItemInner2['default'],
				null,
				_react2['default'].createElement(
					'div',
					{ className: 'FieldLabel' },
					this.props.label
				),
				_react2['default'].createElement(
					_FieldControl2['default'],
					null,
					_react2['default'].createElement(
						'div',
						{ className: (0, _classnames2['default'])('field', this.props.value ? 'u-selectable' : 'field-placeholder') },
						this.props.value || this.props.placeholder
					)
				)
			)
		);
	}
});
},{"./FieldControl":82,"./Item":90,"./ItemInner":92,"classnames":4,"react":undefined}],101:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ListHeader',

	propTypes: {
		className: _react2['default'].PropTypes.string,
		sticky: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var className = (0, _classnames2['default'])('list-header', {
			'sticky': this.props.sticky
		}, this.props.className);

		var props = (0, _blacklist2['default'])(this.props, 'sticky');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],102:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactAddonsCssTransitionGroup = require('react-addons-css-transition-group');

var _reactAddonsCssTransitionGroup2 = _interopRequireDefault(_reactAddonsCssTransitionGroup);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var DIRECTIONS = {
	'reveal-from-right': -1,
	'show-from-left': -1,
	'show-from-right': 1,
	'reveal-from-left': 1
};

var defaultControllerState = {
	direction: 0,
	fade: false,
	leftArrow: false,
	leftButtonDisabled: false,
	leftIcon: '',
	leftLabel: '',
	leftAction: null,
	rightArrow: false,
	rightButtonDisabled: false,
	rightIcon: '',
	rightLabel: '',
	rightAction: null,
	title: ''
};

function newState(from) {
	var ns = _extends({}, defaultControllerState);
	if (from) _extends(ns, from);
	delete ns.name; // may leak from props
	return ns;
}

var NavigationBar = _react2['default'].createClass({
	displayName: 'NavigationBar',

	contextTypes: {
		app: _react2['default'].PropTypes.object
	},

	propTypes: {
		name: _react2['default'].PropTypes.string,
		className: _react2['default'].PropTypes.string
	},

	getInitialState: function getInitialState() {
		return newState(this.props);
	},

	componentDidMount: function componentDidMount() {
		if (this.props.name) {
			this.context.app.navigationBars[this.props.name] = this;
		}
	},

	componentWillUnmount: function componentWillUnmount() {
		if (this.props.name) {
			delete this.context.app.navigationBars[this.props.name];
		}
	},

	componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
		this.setState(newState(nextProps));
		if (nextProps.name !== this.props.name) {
			if (nextProps.name) {
				this.context.app.navigationBars[nextProps.name] = this;
			}
			if (this.props.name) {
				delete this.context.app.navigationBars[this.props.name];
			}
		}
	},

	update: function update(state) {
		// FIXME: what is happening here
		state = newState(state);
		this.setState(newState(state));
	},

	updateWithTransition: function updateWithTransition(state, transition) {
		state = newState(state);
		state.direction = DIRECTIONS[transition] || 0;

		if (transition === 'fade' || transition === 'fade-contract' || transition === 'fade-expand') {
			state.fade = true;
		}

		this.setState(state);
	},

	renderLeftButton: function renderLeftButton() {
		var className = (0, _classnames2['default'])('NavigationBarLeftButton', {
			'has-arrow': this.state.leftArrow
		});

		return _react2['default'].createElement(
			_reactTappable2['default'],
			{ onTap: this.state.leftAction, className: className, disabled: this.state.leftButtonDisabled, component: 'button' },
			this.renderLeftArrow(),
			this.renderLeftLabel()
		);
	},

	renderLeftArrow: function renderLeftArrow() {
		var transitionName = 'NavigationBarTransition-Instant';
		if (this.state.fade || this.state.direction) {
			transitionName = 'NavigationBarTransition-Fade';
		}
		var transitionDuration = transitionName === 'NavigationBarTransition-Instant' ? 50 : 500;

		var arrow = this.state.leftArrow ? _react2['default'].createElement('span', { className: 'NavigationBarLeftArrow' }) : null;

		return _react2['default'].createElement(
			_reactAddonsCssTransitionGroup2['default'],
			{ transitionName: transitionName, transitionEnterTimeout: transitionDuration, transitionLeaveTimeout: transitionDuration },
			arrow
		);
	},

	renderLeftLabel: function renderLeftLabel() {
		var transitionName = 'NavigationBarTransition-Instant';
		if (this.state.fade) {
			transitionName = 'NavigationBarTransition-Fade';
		} else if (this.state.direction > 0) {
			transitionName = 'NavigationBarTransition-Forwards';
		} else if (this.state.direction < 0) {
			transitionName = 'NavigationBarTransition-Backwards';
		}
		var transitionDuration = transitionName === 'NavigationBarTransition-Instant' ? 50 : 500;

		return _react2['default'].createElement(
			_reactAddonsCssTransitionGroup2['default'],
			{ transitionName: transitionName, transitionEnterTimeout: transitionDuration, transitionLeaveTimeout: transitionDuration },
			_react2['default'].createElement(
				'span',
				{ key: Date.now(), className: 'NavigationBarLeftLabel' },
				this.state.leftLabel
			)
		);
	},

	renderTitle: function renderTitle() {
		var title = this.state.title ? _react2['default'].createElement(
			'span',
			{ key: Date.now(), className: 'NavigationBarTitle' },
			this.state.title
		) : null;
		var transitionName = 'NavigationBarTransition-Instant';
		if (this.state.fade) {
			transitionName = 'NavigationBarTransition-Fade';
		} else if (this.state.direction > 0) {
			transitionName = 'NavigationBarTransition-Forwards';
		} else if (this.state.direction < 0) {
			transitionName = 'NavigationBarTransition-Backwards';
		}
		var transitionDuration = transitionName === 'NavigationBarTransition-Instant' ? 50 : 500;

		return _react2['default'].createElement(
			_reactAddonsCssTransitionGroup2['default'],
			{ transitionName: transitionName, transitionEnterTimeout: transitionDuration, transitionLeaveTimeout: transitionDuration },
			title
		);
	},

	renderRightButton: function renderRightButton() {
		var transitionName = 'NavigationBarTransition-Instant';
		if (this.state.fade || this.state.direction) {
			transitionName = 'NavigationBarTransition-Fade';
		}
		var transitionDuration = transitionName === 'NavigationBarTransition-Instant' ? 50 : 500;

		var button = this.state.rightIcon || this.state.rightLabel ? _react2['default'].createElement(
			_reactTappable2['default'],
			{ key: Date.now(), onTap: this.state.rightAction, className: 'NavigationBarRightButton', disabled: this.state.rightButtonDisabled, component: 'button' },
			this.renderRightLabel(),
			this.renderRightIcon()
		) : null;
		return _react2['default'].createElement(
			_reactAddonsCssTransitionGroup2['default'],
			{ transitionName: transitionName, transitionEnterTimeout: transitionDuration, transitionLeaveTimeout: transitionDuration },
			button
		);
	},

	renderRightIcon: function renderRightIcon() {
		if (!this.state.rightIcon) return null;

		var className = (0, _classnames2['default'])('NavigationBarRightIcon', this.state.rightIcon);

		return _react2['default'].createElement('span', { className: className });
	},

	renderRightLabel: function renderRightLabel() {
		return this.state.rightLabel ? _react2['default'].createElement(
			'span',
			{ key: Date.now(), className: 'NavigationBarRightLabel' },
			this.state.rightLabel
		) : null;
	},

	render: function render() {
		return _react2['default'].createElement(
			'div',
			{ className: (0, _classnames2['default'])('NavigationBar', this.props.className) },
			this.renderLeftButton(),
			this.renderTitle(),
			this.renderRightButton()
		);
	}
});

exports['default'] = NavigationBar;
module.exports = exports['default'];
},{"classnames":4,"react":undefined,"react-addons-css-transition-group":undefined,"react-tappable":undefined}],103:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactAddonsCssTransitionGroup = require('react-addons-css-transition-group');

var _reactAddonsCssTransitionGroup2 = _interopRequireDefault(_reactAddonsCssTransitionGroup);

module.exports = _react2['default'].createClass({
	displayName: 'Popup',

	propTypes: {
		children: _react2['default'].PropTypes.node,
		className: _react2['default'].PropTypes.string,
		visible: _react2['default'].PropTypes.bool
	},

	getDefaultProps: function getDefaultProps() {
		return {
			transition: 'none'
		};
	},

	renderBackdrop: function renderBackdrop() {
		if (!this.props.visible) return null;
		return _react2['default'].createElement('div', { className: 'Popup-backdrop' });
	},

	renderDialog: function renderDialog() {
		if (!this.props.visible) return null;

		// Set classnames
		var dialogClassName = (0, _classnames2['default'])('Popup-dialog', this.props.className);

		return _react2['default'].createElement(
			'div',
			{ className: dialogClassName },
			this.props.children
		);
	},

	render: function render() {
		return _react2['default'].createElement(
			'div',
			{ className: 'Popup' },
			_react2['default'].createElement(
				_reactAddonsCssTransitionGroup2['default'],
				{ transitionName: 'Popup-dialog', transitionEnterTimeout: 300, transitionLeaveTimeout: 300, component: 'div' },
				this.renderDialog()
			),
			_react2['default'].createElement(
				_reactAddonsCssTransitionGroup2['default'],
				{ transitionName: 'Popup-background', transitionEnterTimeout: 300, transitionLeaveTimeout: 300, component: 'div' },
				this.renderBackdrop()
			)
		);
	}
});
},{"classnames":4,"react":undefined,"react-addons-css-transition-group":undefined}],104:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'PopupIcon',
	propTypes: {
		name: _react2['default'].PropTypes.string,
		type: _react2['default'].PropTypes.oneOf(['default', 'muted', 'primary', 'success', 'warning', 'danger']),
		spinning: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var className = (0, _classnames2['default'])('PopupIcon', {
			'is-spinning': this.props.spinning
		}, this.props.name, this.props.type);

		return _react2['default'].createElement('div', { className: className });
	}
});
},{"classnames":4,"react":undefined}],105:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _ItemNote = require('./ItemNote');

var _ItemNote2 = _interopRequireDefault(_ItemNote);

var _ItemTitle = require('./ItemTitle');

var _ItemTitle2 = _interopRequireDefault(_ItemTitle);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

module.exports = _react2['default'].createClass({
	displayName: 'RadioList',

	propTypes: {
		options: _react2['default'].PropTypes.array.isRequired,
		value: _react2['default'].PropTypes.oneOfType([_react2['default'].PropTypes.string, _react2['default'].PropTypes.number]),
		icon: _react2['default'].PropTypes.string,
		onChange: _react2['default'].PropTypes.func
	},

	onChange: function onChange(value) {
		this.props.onChange(value);
	},

	render: function render() {
		var self = this;
		var options = this.props.options.map(function (op, i) {
			var iconClassname = (0, _classnames2['default'])('item-icon primary', op.icon);
			var checkMark = op.value === self.props.value ? _react2['default'].createElement(_ItemNote2['default'], { type: 'primary', icon: 'ion-checkmark' }) : null;
			var icon = op.icon ? _react2['default'].createElement(
				'div',
				{ className: 'item-media' },
				_react2['default'].createElement('span', { className: iconClassname })
			) : null;

			function onChange() {
				self.onChange(op.value);
			}

			return _react2['default'].createElement(
				_reactTappable2['default'],
				{ key: 'option-' + i, onTap: onChange },
				_react2['default'].createElement(
					_Item2['default'],
					{ key: 'option-' + i, onTap: onChange },
					icon,
					_react2['default'].createElement(
						_ItemInner2['default'],
						null,
						_react2['default'].createElement(
							_ItemTitle2['default'],
							null,
							op.label
						),
						checkMark
					)
				)
			);
		});

		return _react2['default'].createElement(
			'div',
			null,
			options
		);
	}
});
},{"./Item":90,"./ItemInner":92,"./ItemNote":94,"./ItemTitle":96,"classnames":4,"react":undefined,"react-tappable":undefined}],106:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

module.exports = _react2['default'].createClass({
	displayName: 'SearchField',
	propTypes: {
		className: _react2['default'].PropTypes.string,
		onCancel: _react2['default'].PropTypes.func,
		onChange: _react2['default'].PropTypes.func,
		onClear: _react2['default'].PropTypes.func,
		onSubmit: _react2['default'].PropTypes.func,
		placeholder: _react2['default'].PropTypes.string,
		type: _react2['default'].PropTypes.oneOf(['default', 'dark']),
		value: _react2['default'].PropTypes.string
	},

	getInitialState: function getInitialState() {
		return {
			isFocused: false
		};
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default',
			value: ''
		};
	},

	handleClear: function handleClear() {
		this.refs.input.getDOMNode().focus();
		this.props.onClear();
	},

	handleCancel: function handleCancel() {
		this.refs.input.getDOMNode().blur();
		this.props.onCancel();
	},

	handleChange: function handleChange(e) {
		this.props.onChange(e.target.value);
	},

	handleBlur: function handleBlur(e) {
		this.setState({
			isFocused: false
		});
	},

	handleFocus: function handleFocus(e) {
		this.setState({
			isFocused: true
		});
	},

	handleSubmit: function handleSubmit(e) {
		e.preventDefault();

		var input = this.refs.input.getDOMNode();

		input.blur();
		this.props.onSubmit(input.value);
	},

	renderClear: function renderClear() {
		if (!this.props.value.length) return;
		return _react2['default'].createElement(_reactTappable2['default'], { className: 'SearchField__icon SearchField__icon--clear', onTap: this.handleClear });
	},

	renderCancel: function renderCancel() {
		var className = (0, _classnames2['default'])('SearchField__cancel', {
			'is-visible': this.state.isFocused || this.props.value
		});
		return _react2['default'].createElement(
			_reactTappable2['default'],
			{ className: className, onTap: this.handleCancel },
			'Cancel'
		);
	},

	render: function render() {
		var className = (0, _classnames2['default'])('SearchField', 'SearchField--' + this.props.type, {
			'is-focused': this.state.isFocused,
			'has-value': this.props.value
		}, this.props.className);

		return _react2['default'].createElement(
			'form',
			{ onSubmit: this.handleSubmit, action: 'javascript:;', className: className },
			_react2['default'].createElement(
				'label',
				{ className: 'SearchField__field' },
				_react2['default'].createElement(
					'div',
					{ className: 'SearchField__placeholder' },
					_react2['default'].createElement('span', { className: 'SearchField__icon SearchField__icon--search' }),
					!this.props.value.length ? this.props.placeholder : null
				),
				_react2['default'].createElement('input', { type: 'search', ref: 'input', value: this.props.value, onChange: this.handleChange, onFocus: this.handleFocus, onBlur: this.handleBlur, className: 'SearchField__input' }),
				this.renderClear()
			),
			this.renderCancel()
		);
	}
});
},{"classnames":4,"react":undefined,"react-tappable":undefined}],107:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

module.exports = _react2['default'].createClass({
	displayName: 'SegmentedControl',

	propTypes: {
		className: _react2['default'].PropTypes.string,
		equalWidthSegments: _react2['default'].PropTypes.bool,
		isInline: _react2['default'].PropTypes.bool,
		hasGutter: _react2['default'].PropTypes.bool,
		onChange: _react2['default'].PropTypes.func.isRequired,
		options: _react2['default'].PropTypes.array.isRequired,
		type: _react2['default'].PropTypes.string,
		value: _react2['default'].PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'primary'
		};
	},

	onChange: function onChange(value) {
		this.props.onChange(value);
	},

	render: function render() {
		var componentClassName = (0, _classnames2['default'])('SegmentedControl', 'SegmentedControl--' + this.props.type, {
			'SegmentedControl--inline': this.props.isInline,
			'SegmentedControl--has-gutter': this.props.hasGutter,
			'SegmentedControl--equal-widths': this.props.equalWidthSegments
		}, this.props.className);
		var self = this;

		var options = this.props.options.map(function (op) {
			function onChange() {
				self.onChange(op.value);
			}

			var itemClassName = (0, _classnames2['default'])('SegmentedControl__item', {
				'is-selected': op.value === self.props.value
			});

			return _react2['default'].createElement(
				_reactTappable2['default'],
				{ key: 'option-' + op.value, onTap: onChange, className: itemClassName },
				op.label
			);
		});

		return _react2['default'].createElement(
			'div',
			{ className: componentClassName },
			options
		);
	}
});
},{"classnames":4,"react":undefined,"react-tappable":undefined}],108:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

module.exports = _react2['default'].createClass({
	displayName: 'Switch',

	propTypes: {
		disabled: _react2['default'].PropTypes.bool,
		on: _react2['default'].PropTypes.bool,
		onTap: _react2['default'].PropTypes.func,
		type: _react2['default'].PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Switch', 'Switch--' + this.props.type, {
			'is-disabled': this.props.disabled,
			'is-on': this.props.on
		});

		return _react2['default'].createElement(
			_reactTappable2['default'],
			{ onTap: this.props.onTap, className: className, component: 'label' },
			_react2['default'].createElement(
				'div',
				{ className: 'Switch__track' },
				_react2['default'].createElement('div', { className: 'Switch__handle' })
			)
		);
	}
});
},{"classnames":4,"react":undefined,"react-tappable":undefined}],109:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var Navigator = _react2['default'].createClass({
	displayName: 'Navigator',

	propTypes: {
		className: _react2['default'].PropTypes.string
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Tabs-Navigator', this.props.className);
		var otherProps = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, otherProps));
	}
});

exports.Navigator = Navigator;
var Tab = _react2['default'].createClass({
	displayName: 'Tab',

	propTypes: {
		selected: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Tabs-Tab', { 'is-selected': this.props.selected });
		var otherProps = (0, _blacklist2['default'])(this.props, 'selected');

		return _react2['default'].createElement(_reactTappable2['default'], _extends({ className: className }, otherProps));
	}
});

exports.Tab = Tab;
var Label = _react2['default'].createClass({
	displayName: 'Label',

	render: function render() {
		return _react2['default'].createElement('div', _extends({ className: 'Tabs-Label' }, this.props));
	}
});
exports.Label = Label;
},{"blacklist":2,"classnames":4,"react":undefined,"react-tappable":undefined}],110:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemContent = require('./ItemContent');

var _ItemContent2 = _interopRequireDefault(_ItemContent);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'Input',
	propTypes: {
		className: _react2['default'].PropTypes.string,
		children: _react2['default'].PropTypes.node,
		disabled: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var inputProps = (0, _blacklist2['default'])(this.props, 'children', 'className');

		return _react2['default'].createElement(
			_Item2['default'],
			{ selectable: this.props.disabled, className: this.props.className, component: 'label' },
			_react2['default'].createElement(
				_ItemInner2['default'],
				null,
				_react2['default'].createElement(
					_ItemContent2['default'],
					{ component: 'label' },
					_react2['default'].createElement('textarea', _extends({ className: 'field', rows: 3 }, inputProps))
				),
				this.props.children
			)
		);
	}
});
},{"./Item":90,"./ItemContent":91,"./ItemInner":92,"blacklist":2,"react":undefined}],111:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var Alertbar = require('./Alertbar');
exports.Alertbar = Alertbar;
var Button = require('./Button');
exports.Button = Button;
var ButtonGroup = require('./ButtonGroup');
exports.ButtonGroup = ButtonGroup;
var DatePicker = require('./DatePicker');
exports.DatePicker = DatePicker;
var DatePickerPopup = require('./DatePickerPopup');
exports.DatePickerPopup = DatePickerPopup;
var FieldControl = require('./FieldControl');
exports.FieldControl = FieldControl;
var FieldLabel = require('./FieldLabel');
exports.FieldLabel = FieldLabel;
var Group = require('./Group');
exports.Group = Group;
var GroupBody = require('./GroupBody');
exports.GroupBody = GroupBody;
var GroupFooter = require('./GroupFooter');
exports.GroupFooter = GroupFooter;
var GroupHeader = require('./GroupHeader');
exports.GroupHeader = GroupHeader;
var GroupInner = require('./GroupInner');
exports.GroupInner = GroupInner;
var Item = require('./Item');
exports.Item = Item;
var ItemContent = require('./ItemContent');
exports.ItemContent = ItemContent;
var ItemInner = require('./ItemInner');
exports.ItemInner = ItemInner;
var ItemMedia = require('./ItemMedia');
exports.ItemMedia = ItemMedia;
var ItemNote = require('./ItemNote');
exports.ItemNote = ItemNote;
var ItemSubTitle = require('./ItemSubTitle');
exports.ItemSubTitle = ItemSubTitle;
var ItemTitle = require('./ItemTitle');
exports.ItemTitle = ItemTitle;
var LabelInput = require('./LabelInput');
exports.LabelInput = LabelInput;
var LabelSelect = require('./LabelSelect');
exports.LabelSelect = LabelSelect;
var LabelTextarea = require('./LabelTextarea');
exports.LabelTextarea = LabelTextarea;
var LabelValue = require('./LabelValue');
exports.LabelValue = LabelValue;
var ListHeader = require('./ListHeader');
exports.ListHeader = ListHeader;
var NavigationBar = require('./NavigationBar');
exports.NavigationBar = NavigationBar;
var Popup = require('./Popup');
exports.Popup = Popup;
var PopupIcon = require('./PopupIcon');
exports.PopupIcon = PopupIcon;
var RadioList = require('./RadioList');
exports.RadioList = RadioList;
var SearchField = require('./SearchField');
exports.SearchField = SearchField;
var SegmentedControl = require('./SegmentedControl');
exports.SegmentedControl = SegmentedControl;
var Switch = require('./Switch');
exports.Switch = Switch;
var Tabs = require('./Tabs');
exports.Tabs = Tabs;
var Textarea = require('./Textarea');

exports.Textarea = Textarea;
// depends on above
var Input = require('./Input');
exports.Input = Input;
},{"./Alertbar":77,"./Button":78,"./ButtonGroup":79,"./DatePicker":80,"./DatePickerPopup":81,"./FieldControl":82,"./FieldLabel":83,"./Group":84,"./GroupBody":85,"./GroupFooter":86,"./GroupHeader":87,"./GroupInner":88,"./Input":89,"./Item":90,"./ItemContent":91,"./ItemInner":92,"./ItemMedia":93,"./ItemNote":94,"./ItemSubTitle":95,"./ItemTitle":96,"./LabelInput":97,"./LabelSelect":98,"./LabelTextarea":99,"./LabelValue":100,"./ListHeader":101,"./NavigationBar":102,"./Popup":103,"./PopupIcon":104,"./RadioList":105,"./SearchField":106,"./SegmentedControl":107,"./Switch":108,"./Tabs":109,"./Textarea":110}],112:[function(require,module,exports){

exports = module.exports = trim;

function trim(str){
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  return str.replace(/\s*$/, '');
};

},{}],113:[function(require,module,exports){
/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

// Include a performance.now polyfill
(function () {

	if ('performance' in window === false) {
		window.performance = {};
	}

	// IE 8
	Date.now = (Date.now || function () {
		return new Date().getTime();
	});

	if ('now' in window.performance === false) {
		var offset = window.performance.timing && window.performance.timing.navigationStart ? window.performance.timing.navigationStart
		                                                                                    : Date.now();

		window.performance.now = function () {
			return Date.now() - offset;
		};
	}

})();

var TWEEN = TWEEN || (function () {

	var _tweens = [];

	return {

		getAll: function () {

			return _tweens;

		},

		removeAll: function () {

			_tweens = [];

		},

		add: function (tween) {

			_tweens.push(tween);

		},

		remove: function (tween) {

			var i = _tweens.indexOf(tween);

			if (i !== -1) {
				_tweens.splice(i, 1);
			}

		},

		update: function (time) {

			if (_tweens.length === 0) {
				return false;
			}

			var i = 0;

			time = time !== undefined ? time : window.performance.now();

			while (i < _tweens.length) {

				if (_tweens[i].update(time)) {
					i++;
				} else {
					_tweens.splice(i, 1);
				}

			}

			return true;

		}
	};

})();

TWEEN.Tween = function (object) {

	var _object = object;
	var _valuesStart = {};
	var _valuesEnd = {};
	var _valuesStartRepeat = {};
	var _duration = 1000;
	var _repeat = 0;
	var _yoyo = false;
	var _isPlaying = false;
	var _reversed = false;
	var _delayTime = 0;
	var _startTime = null;
	var _easingFunction = TWEEN.Easing.Linear.None;
	var _interpolationFunction = TWEEN.Interpolation.Linear;
	var _chainedTweens = [];
	var _onStartCallback = null;
	var _onStartCallbackFired = false;
	var _onUpdateCallback = null;
	var _onCompleteCallback = null;
	var _onStopCallback = null;

	// Set all starting values present on the target object
	for (var field in object) {
		_valuesStart[field] = parseFloat(object[field], 10);
	}

	this.to = function (properties, duration) {

		if (duration !== undefined) {
			_duration = duration;
		}

		_valuesEnd = properties;

		return this;

	};

	this.start = function (time) {

		TWEEN.add(this);

		_isPlaying = true;

		_onStartCallbackFired = false;

		_startTime = time !== undefined ? time : window.performance.now();
		_startTime += _delayTime;

		for (var property in _valuesEnd) {

			// Check if an Array was provided as property value
			if (_valuesEnd[property] instanceof Array) {

				if (_valuesEnd[property].length === 0) {
					continue;
				}

				// Create a local copy of the Array with the start value at the front
				_valuesEnd[property] = [_object[property]].concat(_valuesEnd[property]);

			}

			// If `to()` specifies a property that doesn't exist in the source object,
			// we should not set that property in the object
			if (_valuesStart[property] === undefined) {
				continue;
			}

			_valuesStart[property] = _object[property];

			if ((_valuesStart[property] instanceof Array) === false) {
				_valuesStart[property] *= 1.0; // Ensures we're using numbers, not strings
			}

			_valuesStartRepeat[property] = _valuesStart[property] || 0;

		}

		return this;

	};

	this.stop = function () {

		if (!_isPlaying) {
			return this;
		}

		TWEEN.remove(this);
		_isPlaying = false;

		if (_onStopCallback !== null) {
			_onStopCallback.call(_object);
		}

		this.stopChainedTweens();
		return this;

	};

	this.stopChainedTweens = function () {

		for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
			_chainedTweens[i].stop();
		}

	};

	this.delay = function (amount) {

		_delayTime = amount;
		return this;

	};

	this.repeat = function (times) {

		_repeat = times;
		return this;

	};

	this.yoyo = function (yoyo) {

		_yoyo = yoyo;
		return this;

	};


	this.easing = function (easing) {

		_easingFunction = easing;
		return this;

	};

	this.interpolation = function (interpolation) {

		_interpolationFunction = interpolation;
		return this;

	};

	this.chain = function () {

		_chainedTweens = arguments;
		return this;

	};

	this.onStart = function (callback) {

		_onStartCallback = callback;
		return this;

	};

	this.onUpdate = function (callback) {

		_onUpdateCallback = callback;
		return this;

	};

	this.onComplete = function (callback) {

		_onCompleteCallback = callback;
		return this;

	};

	this.onStop = function (callback) {

		_onStopCallback = callback;
		return this;

	};

	this.update = function (time) {

		var property;
		var elapsed;
		var value;

		if (time < _startTime) {
			return true;
		}

		if (_onStartCallbackFired === false) {

			if (_onStartCallback !== null) {
				_onStartCallback.call(_object);
			}

			_onStartCallbackFired = true;

		}

		elapsed = (time - _startTime) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		value = _easingFunction(elapsed);

		for (property in _valuesEnd) {

			// Don't update properties that do not exist in the source object
			if (_valuesStart[property] === undefined) {
				continue;
			}

			var start = _valuesStart[property] || 0;
			var end = _valuesEnd[property];

			if (end instanceof Array) {

				_object[property] = _interpolationFunction(end, value);

			} else {

				// Parses relative end values with start as base (e.g.: +10, -3)
				if (typeof (end) === 'string') {

					if (end.startsWith('+') || end.startsWith('-')) {
						end = start + parseFloat(end, 10);
					} else {
						end = parseFloat(end, 10);
					}
				}

				// Protect against non numeric properties.
				if (typeof (end) === 'number') {
					_object[property] = start + (end - start) * value;
				}

			}

		}

		if (_onUpdateCallback !== null) {
			_onUpdateCallback.call(_object, value);
		}

		if (elapsed === 1) {

			if (_repeat > 0) {

				if (isFinite(_repeat)) {
					_repeat--;
				}

				// Reassign starting values, restart by making startTime = now
				for (property in _valuesStartRepeat) {

					if (typeof (_valuesEnd[property]) === 'string') {
						_valuesStartRepeat[property] = _valuesStartRepeat[property] + parseFloat(_valuesEnd[property], 10);
					}

					if (_yoyo) {
						var tmp = _valuesStartRepeat[property];

						_valuesStartRepeat[property] = _valuesEnd[property];
						_valuesEnd[property] = tmp;
					}

					_valuesStart[property] = _valuesStartRepeat[property];

				}

				if (_yoyo) {
					_reversed = !_reversed;
				}

				_startTime = time + _delayTime;

				return true;

			} else {

				if (_onCompleteCallback !== null) {
					_onCompleteCallback.call(_object);
				}

				for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
					// Make the chained tweens start exactly at the time they should,
					// even if the `update()` method was called way past the duration of the tween
					_chainedTweens[i].start(_startTime + _duration);
				}

				return false;

			}

		}

		return true;

	};

};


TWEEN.Easing = {

	Linear: {

		None: function (k) {

			return k;

		}

	},

	Quadratic: {

		In: function (k) {

			return k * k;

		},

		Out: function (k) {

			return k * (2 - k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k;
			}

			return - 0.5 * (--k * (k - 2) - 1);

		}

	},

	Cubic: {

		In: function (k) {

			return k * k * k;

		},

		Out: function (k) {

			return --k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k + 2);

		}

	},

	Quartic: {

		In: function (k) {

			return k * k * k * k;

		},

		Out: function (k) {

			return 1 - (--k * k * k * k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k;
			}

			return - 0.5 * ((k -= 2) * k * k * k - 2);

		}

	},

	Quintic: {

		In: function (k) {

			return k * k * k * k * k;

		},

		Out: function (k) {

			return --k * k * k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k * k * k + 2);

		}

	},

	Sinusoidal: {

		In: function (k) {

			return 1 - Math.cos(k * Math.PI / 2);

		},

		Out: function (k) {

			return Math.sin(k * Math.PI / 2);

		},

		InOut: function (k) {

			return 0.5 * (1 - Math.cos(Math.PI * k));

		}

	},

	Exponential: {

		In: function (k) {

			return k === 0 ? 0 : Math.pow(1024, k - 1);

		},

		Out: function (k) {

			return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if ((k *= 2) < 1) {
				return 0.5 * Math.pow(1024, k - 1);
			}

			return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);

		}

	},

	Circular: {

		In: function (k) {

			return 1 - Math.sqrt(1 - k * k);

		},

		Out: function (k) {

			return Math.sqrt(1 - (--k * k));

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return - 0.5 * (Math.sqrt(1 - k * k) - 1);
			}

			return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function (k) {

			var s;
			var a = 0.1;
			var p = 0.4;

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if (!a || a < 1) {
				a = 1;
				s = p / 4;
			} else {
				s = p * Math.asin(1 / a) / (2 * Math.PI);
			}

			return - (a * Math.pow(2, 10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p));

		},

		Out: function (k) {

			var s;
			var a = 0.1;
			var p = 0.4;

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if (!a || a < 1) {
				a = 1;
				s = p / 4;
			} else {
				s = p * Math.asin(1 / a) / (2 * Math.PI);
			}

			return (a * Math.pow(2, - 10 * k) * Math.sin((k - s) * (2 * Math.PI) / p) + 1);

		},

		InOut: function (k) {

			var s;
			var a = 0.1;
			var p = 0.4;

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if (!a || a < 1) {
				a = 1;
				s = p / 4;
			} else {
				s = p * Math.asin(1 / a) / (2 * Math.PI);
			}

			if ((k *= 2) < 1) {
				return - 0.5 * (a * Math.pow(2, 10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p));
			}

			return a * Math.pow(2, -10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p) * 0.5 + 1;

		}

	},

	Back: {

		In: function (k) {

			var s = 1.70158;

			return k * k * ((s + 1) * k - s);

		},

		Out: function (k) {

			var s = 1.70158;

			return --k * k * ((s + 1) * k + s) + 1;

		},

		InOut: function (k) {

			var s = 1.70158 * 1.525;

			if ((k *= 2) < 1) {
				return 0.5 * (k * k * ((s + 1) * k - s));
			}

			return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);

		}

	},

	Bounce: {

		In: function (k) {

			return 1 - TWEEN.Easing.Bounce.Out(1 - k);

		},

		Out: function (k) {

			if (k < (1 / 2.75)) {
				return 7.5625 * k * k;
			} else if (k < (2 / 2.75)) {
				return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
			} else if (k < (2.5 / 2.75)) {
				return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
			} else {
				return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
			}

		},

		InOut: function (k) {

			if (k < 0.5) {
				return TWEEN.Easing.Bounce.In(k * 2) * 0.5;
			}

			return TWEEN.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.Linear;

		if (k < 0) {
			return fn(v[0], v[1], f);
		}

		if (k > 1) {
			return fn(v[m], v[m - 1], m - f);
		}

		return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);

	},

	Bezier: function (v, k) {

		var b = 0;
		var n = v.length - 1;
		var pw = Math.pow;
		var bn = TWEEN.Interpolation.Utils.Bernstein;

		for (var i = 0; i <= n; i++) {
			b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
		}

		return b;

	},

	CatmullRom: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.CatmullRom;

		if (v[0] === v[m]) {

			if (k < 0) {
				i = Math.floor(f = m * (1 + k));
			}

			return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);

		} else {

			if (k < 0) {
				return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
			}

			if (k > 1) {
				return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
			}

			return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);

		}

	},

	Utils: {

		Linear: function (p0, p1, t) {

			return (p1 - p0) * t + p0;

		},

		Bernstein: function (n, i) {

			var fc = TWEEN.Interpolation.Utils.Factorial;

			return fc(n) / fc(i) / fc(n - i);

		},

		Factorial: (function () {

			var a = [1];

			return function (n) {

				var s = 1;

				if (a[n]) {
					return a[n];
				}

				for (var i = n; i > 1; i--) {
					s *= i;
				}

				a[n] = s;
				return s;

			};

		})(),

		CatmullRom: function (p0, p1, p2, p3, t) {

			var v0 = (p2 - p0) * 0.5;
			var v1 = (p3 - p1) * 0.5;
			var t2 = t * t;
			var t3 = t * t2;

			return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;

		}

	}

};

// UMD (Universal Module Definition)
(function (root) {

	if (typeof define === 'function' && define.amd) {

		// AMD
		define([], function () {
			return TWEEN;
		});

	} else if (typeof module !== 'undefined' && typeof exports === 'object') {

		// Node.js
		module.exports = TWEEN;

	} else if (root !== undefined) {

		// Global variable
		root.TWEEN = TWEEN;

	}

})(this);

},{}],114:[function(require,module,exports){
"use strict";
var window = require("global/window")
var once = require("once")
var isFunction = require("is-function")
var parseHeaders = require("parse-headers")
var xtend = require("xtend")

module.exports = createXHR
createXHR.XMLHttpRequest = window.XMLHttpRequest || noop
createXHR.XDomainRequest = "withCredentials" in (new createXHR.XMLHttpRequest()) ? createXHR.XMLHttpRequest : window.XDomainRequest

forEachArray(["get", "put", "post", "patch", "head", "delete"], function(method) {
    createXHR[method === "delete" ? "del" : method] = function(uri, options, callback) {
        options = initParams(uri, options, callback)
        options.method = method.toUpperCase()
        return _createXHR(options)
    }
})

function forEachArray(array, iterator) {
    for (var i = 0; i < array.length; i++) {
        iterator(array[i])
    }
}

function isEmpty(obj){
    for(var i in obj){
        if(obj.hasOwnProperty(i)) return false
    }
    return true
}

function initParams(uri, options, callback) {
    var params = uri

    if (isFunction(options)) {
        callback = options
        if (typeof uri === "string") {
            params = {uri:uri}
        }
    } else {
        params = xtend(options, {uri: uri})
    }

    params.callback = callback
    return params
}

function createXHR(uri, options, callback) {
    options = initParams(uri, options, callback)
    return _createXHR(options)
}

function _createXHR(options) {
    var callback = options.callback
    if(typeof callback === "undefined"){
        throw new Error("callback argument missing")
    }
    callback = once(callback)

    function readystatechange() {
        if (xhr.readyState === 4) {
            loadFunc()
        }
    }

    function getBody() {
        // Chrome with requestType=blob throws errors arround when even testing access to responseText
        var body = undefined

        if (xhr.response) {
            body = xhr.response
        } else if (xhr.responseType === "text" || !xhr.responseType) {
            body = xhr.responseText || xhr.responseXML
        }

        if (isJson) {
            try {
                body = JSON.parse(body)
            } catch (e) {}
        }

        return body
    }

    var failureResponse = {
                body: undefined,
                headers: {},
                statusCode: 0,
                method: method,
                url: uri,
                rawRequest: xhr
            }

    function errorFunc(evt) {
        clearTimeout(timeoutTimer)
        if(!(evt instanceof Error)){
            evt = new Error("" + (evt || "Unknown XMLHttpRequest Error") )
        }
        evt.statusCode = 0
        callback(evt, failureResponse)
    }

    // will load the data & process the response in a special response object
    function loadFunc() {
        if (aborted) return
        var status
        clearTimeout(timeoutTimer)
        if(options.useXDR && xhr.status===undefined) {
            //IE8 CORS GET successful response doesn't have a status field, but body is fine
            status = 200
        } else {
            status = (xhr.status === 1223 ? 204 : xhr.status)
        }
        var response = failureResponse
        var err = null

        if (status !== 0){
            response = {
                body: getBody(),
                statusCode: status,
                method: method,
                headers: {},
                url: uri,
                rawRequest: xhr
            }
            if(xhr.getAllResponseHeaders){ //remember xhr can in fact be XDR for CORS in IE
                response.headers = parseHeaders(xhr.getAllResponseHeaders())
            }
        } else {
            err = new Error("Internal XMLHttpRequest Error")
        }
        callback(err, response, response.body)

    }

    var xhr = options.xhr || null

    if (!xhr) {
        if (options.cors || options.useXDR) {
            xhr = new createXHR.XDomainRequest()
        }else{
            xhr = new createXHR.XMLHttpRequest()
        }
    }

    var key
    var aborted
    var uri = xhr.url = options.uri || options.url
    var method = xhr.method = options.method || "GET"
    var body = options.body || options.data || null
    var headers = xhr.headers = options.headers || {}
    var sync = !!options.sync
    var isJson = false
    var timeoutTimer

    if ("json" in options) {
        isJson = true
        headers["accept"] || headers["Accept"] || (headers["Accept"] = "application/json") //Don't override existing accept header declared by user
        if (method !== "GET" && method !== "HEAD") {
            headers["content-type"] || headers["Content-Type"] || (headers["Content-Type"] = "application/json") //Don't override existing accept header declared by user
            body = JSON.stringify(options.json)
        }
    }

    xhr.onreadystatechange = readystatechange
    xhr.onload = loadFunc
    xhr.onerror = errorFunc
    // IE9 must have onprogress be set to a unique function.
    xhr.onprogress = function () {
        // IE must die
    }
    xhr.ontimeout = errorFunc
    xhr.open(method, uri, !sync, options.username, options.password)
    //has to be after open
    if(!sync) {
        xhr.withCredentials = !!options.withCredentials
    }
    // Cannot set timeout with sync request
    // not setting timeout on the xhr object, because of old webkits etc. not handling that correctly
    // both npm's request and jquery 1.x use this kind of timeout, so this is being consistent
    if (!sync && options.timeout > 0 ) {
        timeoutTimer = setTimeout(function(){
            aborted=true//IE9 may still call readystatechange
            xhr.abort("timeout")
            var e = new Error("XMLHttpRequest timeout")
            e.code = "ETIMEDOUT"
            errorFunc(e)
        }, options.timeout )
    }

    if (xhr.setRequestHeader) {
        for(key in headers){
            if(headers.hasOwnProperty(key)){
                xhr.setRequestHeader(key, headers[key])
            }
        }
    } else if (options.headers && !isEmpty(options.headers)) {
        throw new Error("Headers cannot be set on an XDomainRequest object")
    }

    if ("responseType" in options) {
        xhr.responseType = options.responseType
    }

    if ("beforeSend" in options &&
        typeof options.beforeSend === "function"
    ) {
        options.beforeSend(xhr)
    }

    xhr.send(body)

    return xhr


}

function noop() {}

},{"global/window":8,"is-function":11,"once":12,"parse-headers":13,"xtend":115}],115:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],116:[function(require,module,exports){
"use strict";

module.exports = {
  celebrities: [{
    name: "Angelina Jolie",
    coverPhoto: "angelina.jpg",
    description: "Angelina Jolie Pitt (/dʒoʊˈliː/ joh-lee; née Voight; June 4, 1975)[1] is an American actress, filmmaker, and humanitarian. She has received an Academy Award, two Screen Actors Guild Awards, and three Golden Globe Awards, and has been cited as Hollywood's highest-paid actress. Jolie made her screen debut as a child alongside her father, Jon Voight, in Lookin' to Get Out (1982). Her film career began in earnest a decade later with the low-budget production Cyborg 2 (1993), followed by her first leading role in a major film, Hackers (1995). She starred in the critically acclaimed biographical television films George Wallace (1997) and Gia (1998), and won an Academy Award for Best Supporting Actress for her performance in the drama Girl, Interrupted (1999).",
    diet: {
      name: "Ancient grains diet",
      description: "Angelina Jolie has a strict diet regime. During Tomb Raider movie she trained to become a more athletic woman. She used to have a high protein diet, low carbohydrate meal to help her in building muscle. The film required her to be an athletic woman. Like all the Hollywood celebrities she consumes lots of protein, takes steamed vegetables, fruits and lots of water in her diet. They take a little amount of complex carbohydrate, enough to replenish the body with the required energy. These days celebrity trainers are forcing their celebrities to perform intense aerobic and anaerobic exercises that help in burning the fat quickly. She opts for a diet plan that includes fresh fruits. She avoids the use of red meat and wheat based food items. She also likes having raw salads in her meal.",
      nutritionalSummary: [{ label: "fats", value: 20 }, { label: "proteins", value: 30 }, { label: "carbs", value: 50 }],
      meals: {
        breakfast: [{
          name: "Grilled Peanut Butter and Banana Sandwich",
          description: "A sweet, warm breakfast idea. Cooked like a grilled cheese, but filled with melted peanut butter and warm bananas",
          coverPhoto: "banana.jpg",
          recipe: "Heat a skillet or griddle over medium heat, and coat with cooking spray. Spread 1 tablespoon of peanut butter onto one side of each slice of bread. Place banana slices onto the peanut buttered side of one slice, top with the other slice and press together firmly. Fry the sandwich until golden brown on each side, about 2 minutes per side.",
          kcal: "437kcal",
          fat: "18.7g",
          proteins: "16.8g",
          carbs: "56.8g",
          time: "12m",
          ingredients: ["1 cooking spray", "2 tablespoons peanut butter", "2 slices whole wheat bread", "1 banana, sliced"]
        }, {
          name: "Muesli",
          description: "This is a nutritious and delicious breakfast cereal. Use any type of dried fruit you desire! You can also use almonds in place of walnuts if you like. Wonderful when served in bowls with milk and fresh berries or sliced fresh fruit.",
          coverPhoto: "muesli.jpg",
          recipe: "In a large mixing bowl combine oats, wheat germ, wheat bran, oat bran, dried fruit, nuts, sugar, and seeds. Mix well. Store muesli in an airtight container. It keeps for 2 months at room temperature.",
          kcal: "188kcal",
          fat: "5.7g",
          proteins: "6.1g",
          carbs: "31.8g",
          time: "10m",
          ingredients: ["4 1/2 cups rolled oats", "1/2 cup toasted wheat germ", "1/2 cup wheat bran", "1/2 cup oat bran", "1 cup raisins", "1/2 cup chopped walnuts", "1/4 cup packed brown sugar", "1 cup raw sunflower seeds", "2 Girls"]
        }, {
          name: "Pumpkin Oatmeal",
          description: "A great way to get a serving of whole grains and a yellow vegetable in the morning!",
          coverPhoto: "breakfast3.jpg",
          recipe: "Mix together oats and milk in a microwave-safe bowl. Cook on high for 1 to 2 minutes, stirring once. Add more milk or oats to achieve the desired consistency, and cook for another 30 seconds. Stir in pumpkin puree, pumpkin pie spice, and cinnamon sugar. Heat through, and serve.",
          kcal: "229kcal",
          fat: "4.7g",
          proteins: "9.4g",
          carbs: "38.7g",
          time: "8m",
          ingredients: ["1 cup quick-cooking rolled oats", "3/4 cup milk, or as needed", "1/2 cup canned pumpkin puree", "1/4 teaspoon pumpkin pie spice", "1 teaspoon cinnamon sugar"]
        }],
        appetizer: [{
          name: "Extra Easy Hummus",
          description: "Tahini-free hummus that only takes minutes.",
          coverPhoto: "hummus.jpg",
          recipe: "appetizer1 Recipe",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "15m",
          ingredients: ["120g sugar", "250g bread", "200g chickpeans", "20ml Oil"]
        }, {
          name: "Very Easy Shrimp Dip",
          description: "Really cool dip with Shrimps and coolness",
          coverPhoto: "shrimpdip.jpg",
          recipe: "Spread the cream cheese on the bottom of a 8 inch square serving dish. Layer the shrimp over the cream cheese. Pour the cocktail sauce over the top.",
          kcal: "134kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "10m",
          ingredients: ["1 ounce Package Cream cheese", "1 ounce can small shrimp, drained", "1/2 ounce bottle cocktail sauce"]
        }, {
          name: "Artichoke & Spinach Dip Restaurant Style",
          description: "Supercool dip with artichoke and Spinach just ",
          coverPhoto: "artichoke.jpg",
          recipe: "Preheat oven to 350 degrees F (175 degrees C). Place garlic in a small baking dish. Bake in the preheated oven 20 to 30 minutes, until soft. Remove from heat. When cool enough to touch, squeeze softened garlic from skins. In an 8x8 inch baking dish, spread the roasted garlic, spinach, artichoke hearts, Alfredo-style pasta sauce, mozzarella cheese, Parmesan cheese, and cream cheese. Bake in the preheated oven 30 minutes, or until cheeses are melted and bubbly. Serve warm.",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "5m",
          ingredients: ["120g artichoke", "2 container Alfredo-style pasta sauce", "1 cup shredded mozzarella cheese", "1/3 cup grated Parmesan cheese"]
        }],
        lunch: [{
          name: "A Jerky Chicken",
          description: "A great Jamaican style dish. A spicy blend of herbs, vinegar, and a habanero pepper make this chicken dish unforgettable. Serve with rice, yum!",
          coverPhoto: "jerky.jpg",
          recipe: "lunch1 Recipe",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "75m",
          ingredients: ["1 teaspoon onion, finely chopped", "3 tablespoons brown sugar", "4 tablespoons soy sauce", "4 tablespoons red wine vinegar", "2 teaspoons chopped fresh thyme", "1 teaspoon sesame oil", "3 cloves garlic, chopped"]
        }, {
          name: "Simple Pasta Salad",
          description: "An easy, yet very yummy pasta salad. Almost any type of pasta may be used. Best if left to sit overnight.",
          coverPhoto: "pasta.jpg",
          recipe: "Bring a large pot of lightly salted water to a boil. Place pasta in the pot, cook for 8 to 12 minutes, until al dente, and drain. In a large bowl, toss the cooked pasta with the Italian dressing, cucumbers, tomatoes, and green onions. In a small bowl, mix the Parmesan cheese and Italian seasoning, and gently mix into the salad. Cover, and refrigerate until serving.",
          kcal: "289kcal",
          fat: "5g",
          proteins: "28g",
          carbs: "54g",
          ingredients: ["1 tablespoon Italian seasoning", "1 bunch green onions, chopped", "6 tomatoes, chopped", "2 cucumbers, chopped", "1 package uncooked rotini pasta"]
        }],
        snack: [{
          name: "Annie's Fruit Salsa and Cinnamon Chips",
          description: "Easy to make, tasty fruit salsa and cinnamon tortilla chips. Great as an appetizer or a snack. Great for anytime",
          coverPhoto: "annie.jpg",
          recipe: "In a large bowl, thoroughly mix kiwis, Golden Delicious apples, raspberries, strawberries, white sugar, brown sugar and fruit preserves. Cover and chill in the refrigerator at least 15 minutes.Preheat oven to 350 degrees F (175 degrees C). Coat one side of each flour tortilla with butter flavored cooking spray. Cut into wedges and arrange in a single layer on a large baking sheet. Sprinkle wedges with desired amount of cinnamon sugar. Spray again with cooking spray. Bake in the preheated oven 8 to 10 minutes. Repeat with any remaining tortilla wedges. Allow to cool approximately 15 minutes. Serve with chilled fruit mixture.",
          kcal: "312 kcal",
          fat: "5g",
          proteins: "68g",
          carbs: "59g",
          time: "25m",
          ingredients: ["1 kiwis, peeled and diced", "1 Golden Delicious apples - peeled, cored and diced", "1/4 pound raspberries", "1/2 pound strawberries", "1 tablespoon white sugar", "1-1/2 teaspoons brown sugar", "1 tablespoon and 1-1/2 teaspoons fruit preserves, any flavor", "5 (10 inch) flour tortillas", "butter flavored cooking spray", "1 tablespoon cinnamon sugar"]
        }, {
          name: "Baked Zucchini Chips",
          description: "A quick, healthy way to use some of that zucchini from your garden",
          coverPhoto: "zucchini.jpg",
          recipe: "1ºPreheat the oven to 475 degrees F (245 degrees C). 2ºIn one small bowl, stir together the bread crumbs, pepper and Parmesan cheese. Place the egg whites in a separate bowl. Dip zucchini slices into the egg whites, then coat the breadcrumb mixture. Place on a greased baking sheet. 3ºBake for 5 minutes in the preheated oven, then turn over and bake for another 5 to 10 minutes, until browned and crispy.",
          kcal: "92 kcal",
          fat: "1.7 g",
          proteins: "6.1 g",
          carbs: "13.8 g",
          time: "15 m",
          ingredients: ["1 medium zucchini, cut into 1/4-inch slices", "1/4 cup seasoned dry bread crumbs", "1/8 teaspoon ground black pepper", "1 tablespoon grated Parmesan cheese", "1 egg whites"]
        }],
        dinner: [{
          name: "Maple Salmon",
          description: "This is the best and most delicious salmon recipe, and very easy to prepare. I love maple in everything and put this together one night. My husband totally loved it; he did not like salmon that much until he had this.",
          coverPhoto: "maple.jpg",
          recipe: "In a small bowl, mix the maple syrup, soy sauce, garlic, garlic salt, and pepper. Place salmon in a shallow glass baking dish, and coat with the maple syrup mixture. Cover the dish, and marinate salmon in the refrigerator 30 minutes, turning once. Preheat oven to 400 degrees F (200 degrees C). Place the baking dish in the preheated oven, and bake salmon uncovered 20 minutes, or until easily flaked with a fork.",
          kcal: "265kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "60m",
          ingredients: ["1/4 cup maple syrup", "2 tablespoons soy sauce", "1 clove garlic, minced", "1/4 teaspoon garlic salt", "1/8 teaspoon ground black pepper", "1 pound salmon"]
        }, {
          name: "Angela's Awesome Enchiladas",
          description: "The secret is in the seasonings! I whipped these up on my own using stuff I had on hand. Shredding the chicken is the most time-consuming step, but it's worth it in the end. Give these babies a try! Serve with sour cream and a side of Spanish rice.",
          coverPhoto: "angela.jpg",
          recipe: "Place the chicken in a large pot and add water to cover. Bring to a boil over high heat, then reduce the heat to medium-low, cover, and simmer until the chicken pieces are no longer pink, about 10 minutes. Shred chicken by placing two forks back to back and pulling meat apart. Set the shredded chicken aside. Meanwhile, combine the cream of chicken soup, sour cream, and chili powder in a saucepan. Bring to a simmer over low heat, stirring occasionally, then turn off the heat and cover to keep warm. Heat the butter in a skillet over medium heat. Stir in the onion; cook and stir until the onion has softened and turned translucent, about 5 minutes. Add the shredded chicken, chopped green chilies, taco seasoning, half of the bunch of chopped green onion, and water. Allow to simmer for 10 minutes. Stir in the lime juice, onion powder, and garlic powder; simmer for an additional 10 minutes.",
          kcal: "709kcal",
          fat: "549g",
          proteins: "22g",
          carbs: "48g",
          time: "95m",
          ingredients: ["2 pounds skinless, boneless chicken breast meat - cut into chunks", "1 1/4 cups sour cream", "1 tablespoon butter", "1 small onion, chopped", "1 cup water", "1 teaspoon lime juice", "2 cups Cheddar cheese, shredded, divided"]
        }]
      },
      shoppingList: ["2 pounds of Rice", "3 pounds of Chicken Breasts ", "1 liter lime juice", "1 bottle of maple syrup", "2 bottle of soy sauce", "24 egg whites", "2 garlic ", "1 zucchini", "6 tomatoes", "12 kiwis", "1 white sugar", "1 bottle of Italian seasoning", "1 pound salmon", "1 bottle of sesame oil", "2 bread sticks", "5 Bananas"]
    }
  }, {
    name: "Victoria Beckham",
    coverPhoto: "beckham.png",
    description: "Victoria Caroline Beckham (née Adams; born 17 April 1974)[2][3] is an English businesswoman, fashion designer, model and singer. In the late 1990s, Beckham rose to fame with the all-female pop group Spice Girls and was dubbed Posh Spice by the July 1996 issue of the British music magazine Top of the Pops.[4] After the Spice Girls split, she was signed to Virgin Records and Telstar Records and had four UK Top 10 singles. Her first release, \"Out of Your Mind\", reached Number 2 in the UK Singles Chart.",
    diet: {
      name: "The Alkaline Diet",
      description: "Alkaline diet (also known as the alkaline ash diet, alkaline acid diet, acid ash diet, and the acid alkaline diet) describes a group of loosely related diets based on the belief that certain foods can affect the acidity and pH of bodily fluids, including the urine or blood, and can therefore be used to treat or prevent diseases. Due to the lack of credible evidence supporting any benefits of this diet, it is generally not recommended by dietitians and other health professionals.",
      nutritionalSummary: [{ label: "fats", value: 20 }, { label: "proteins", value: 50 }, { label: "carbs", value: 30 }],
      meals: {
        breakfast: [{
          name: "Grilled Peanut Butter and Banana Sandwich",
          description: "A sweet, warm breakfast idea. Cooked like a grilled cheese, but filled with melted peanut butter and warm bananas",
          coverPhoto: "banana.jpg",
          recipe: "Heat a skillet or griddle over medium heat, and coat with cooking spray. Spread 1 tablespoon of peanut butter onto one side of each slice of bread. Place banana slices onto the peanut buttered side of one slice, top with the other slice and press together firmly. Fry the sandwich until golden brown on each side, about 2 minutes per side.",
          kcal: "437kcal",
          fat: "18.7g",
          proteins: "16.8g",
          carbs: "56.8g",
          time: "12m",
          ingredients: ["1 cooking spray", "2 tablespoons peanut butter", "2 slices whole wheat bread", "1 banana, sliced"]
        }, {
          name: "Muesli",
          description: "This is a nutritious and delicious breakfast cereal. Use any type of dried fruit you desire! You can also use almonds in place of walnuts if you like. Wonderful when served in bowls with milk and fresh berries or sliced fresh fruit.",
          coverPhoto: "muesli.jpg",
          recipe: "In a large mixing bowl combine oats, wheat germ, wheat bran, oat bran, dried fruit, nuts, sugar, and seeds. Mix well. Store muesli in an airtight container. It keeps for 2 months at room temperature.",
          kcal: "188kcal",
          fat: "5.7g",
          proteins: "6.1g",
          carbs: "31.8g",
          time: "10m",
          ingredients: ["4 1/2 cups rolled oats", "1/2 cup toasted wheat germ", "1/2 cup wheat bran", "1/2 cup oat bran", "1 cup raisins", "1/2 cup chopped walnuts", "1/4 cup packed brown sugar", "1 cup raw sunflower seeds", "2 Girls"]
        }, {
          name: "Pumpkin Oatmeal",
          description: "A great way to get a serving of whole grains and a yellow vegetable in the morning!",
          coverPhoto: "breakfast3.jpg",
          recipe: "Mix together oats and milk in a microwave-safe bowl. Cook on high for 1 to 2 minutes, stirring once. Add more milk or oats to achieve the desired consistency, and cook for another 30 seconds. Stir in pumpkin puree, pumpkin pie spice, and cinnamon sugar. Heat through, and serve.",
          kcal: "229kcal",
          fat: "4.7g",
          proteins: "9.4g",
          carbs: "38.7g",
          time: "8m",
          ingredients: ["1 cup quick-cooking rolled oats", "3/4 cup milk, or as needed", "1/2 cup canned pumpkin puree", "1/4 teaspoon pumpkin pie spice", "1 teaspoon cinnamon sugar"]
        }],
        appetizer: [{
          name: "Extra Easy Hummus",
          description: "Tahini-free hummus that only takes minutes.",
          coverPhoto: "hummus.jpg",
          recipe: "appetizer1 Recipe",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "15m",
          ingredients: ["120g sugar", "250g bread", "200g chickpeans", "20ml Oil"]
        }, {
          name: "Very Easy Shrimp Dip",
          description: "Really cool dip with Shrimps and coolness",
          coverPhoto: "shrimpdip.jpg",
          recipe: "Spread the cream cheese on the bottom of a 8 inch square serving dish. Layer the shrimp over the cream cheese. Pour the cocktail sauce over the top.",
          kcal: "134kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "10m",
          ingredients: ["1 ounce Package Cream cheese", "1 ounce can small shrimp, drained", "1/2 ounce bottle cocktail sauce"]
        }, {
          name: "Artichoke & Spinach Dip Restaurant Style",
          description: "Supercool dip with artichoke and Spinach just ",
          coverPhoto: "artichoke.jpg",
          recipe: "Preheat oven to 350 degrees F (175 degrees C). Place garlic in a small baking dish. Bake in the preheated oven 20 to 30 minutes, until soft. Remove from heat. When cool enough to touch, squeeze softened garlic from skins. In an 8x8 inch baking dish, spread the roasted garlic, spinach, artichoke hearts, Alfredo-style pasta sauce, mozzarella cheese, Parmesan cheese, and cream cheese. Bake in the preheated oven 30 minutes, or until cheeses are melted and bubbly. Serve warm.",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "5m",
          ingredients: ["120g artichoke", "2 container Alfredo-style pasta sauce", "1 cup shredded mozzarella cheese", "1/3 cup grated Parmesan cheese"]
        }],
        lunch: [{
          name: "A Jerky Chicken",
          description: "A great Jamaican style dish. A spicy blend of herbs, vinegar, and a habanero pepper make this chicken dish unforgettable. Serve with rice, yum!",
          coverPhoto: "jerky.jpg",
          recipe: "lunch1 Recipe",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "75m",
          ingredients: ["1 teaspoon onion, finely chopped", "3 tablespoons brown sugar", "4 tablespoons soy sauce", "4 tablespoons red wine vinegar", "2 teaspoons chopped fresh thyme", "1 teaspoon sesame oil", "3 cloves garlic, chopped"]
        }, {
          name: "Simple Pasta Salad",
          description: "An easy, yet very yummy pasta salad. Almost any type of pasta may be used. Best if left to sit overnight.",
          coverPhoto: "pasta.jpg",
          recipe: "Bring a large pot of lightly salted water to a boil. Place pasta in the pot, cook for 8 to 12 minutes, until al dente, and drain. In a large bowl, toss the cooked pasta with the Italian dressing, cucumbers, tomatoes, and green onions. In a small bowl, mix the Parmesan cheese and Italian seasoning, and gently mix into the salad. Cover, and refrigerate until serving.",
          kcal: "289kcal",
          fat: "5g",
          proteins: "28g",
          carbs: "54g",
          ingredients: ["1 tablespoon Italian seasoning", "1 bunch green onions, chopped", "6 tomatoes, chopped", "2 cucumbers, chopped", "1 package uncooked rotini pasta"]
        }],
        snack: [{
          name: "Annie's Fruit Salsa and Cinnamon Chips",
          description: "Easy to make, tasty fruit salsa and cinnamon tortilla chips. Great as an appetizer or a snack. Great for anytime",
          coverPhoto: "annie.jpg",
          recipe: "In a large bowl, thoroughly mix kiwis, Golden Delicious apples, raspberries, strawberries, white sugar, brown sugar and fruit preserves. Cover and chill in the refrigerator at least 15 minutes.Preheat oven to 350 degrees F (175 degrees C). Coat one side of each flour tortilla with butter flavored cooking spray. Cut into wedges and arrange in a single layer on a large baking sheet. Sprinkle wedges with desired amount of cinnamon sugar. Spray again with cooking spray. Bake in the preheated oven 8 to 10 minutes. Repeat with any remaining tortilla wedges. Allow to cool approximately 15 minutes. Serve with chilled fruit mixture.",
          kcal: "312 kcal",
          fat: "5g",
          proteins: "68g",
          carbs: "59g",
          time: "25m",
          ingredients: ["1 kiwis, peeled and diced", "1 Golden Delicious apples - peeled, cored and diced", "1/4 pound raspberries", "1/2 pound strawberries", "1 tablespoon white sugar", "1-1/2 teaspoons brown sugar", "1 tablespoon and 1-1/2 teaspoons fruit preserves, any flavor", "5 (10 inch) flour tortillas", "butter flavored cooking spray", "1 tablespoon cinnamon sugar"]
        }, {
          name: "Baked Zucchini Chips",
          description: "A quick, healthy way to use some of that zucchini from your garden",
          coverPhoto: "zucchini.jpg",
          recipe: "1ºPreheat the oven to 475 degrees F (245 degrees C). 2ºIn one small bowl, stir together the bread crumbs, pepper and Parmesan cheese. Place the egg whites in a separate bowl. Dip zucchini slices into the egg whites, then coat the breadcrumb mixture. Place on a greased baking sheet. 3ºBake for 5 minutes in the preheated oven, then turn over and bake for another 5 to 10 minutes, until browned and crispy.",
          kcal: "92 kcal",
          fat: "1.7 g",
          proteins: "6.1 g",
          carbs: "13.8 g",
          time: "15 m",
          ingredients: ["1 medium zucchini, cut into 1/4-inch slices", "1/4 cup seasoned dry bread crumbs", "1/8 teaspoon ground black pepper", "1 tablespoon grated Parmesan cheese", "1 egg whites"]
        }],
        dinner: [{
          name: "Maple Salmon",
          description: "This is the best and most delicious salmon recipe, and very easy to prepare. I love maple in everything and put this together one night. My husband totally loved it; he did not like salmon that much until he had this.",
          coverPhoto: "maple.jpg",
          recipe: "In a small bowl, mix the maple syrup, soy sauce, garlic, garlic salt, and pepper. Place salmon in a shallow glass baking dish, and coat with the maple syrup mixture. Cover the dish, and marinate salmon in the refrigerator 30 minutes, turning once. Preheat oven to 400 degrees F (200 degrees C). Place the baking dish in the preheated oven, and bake salmon uncovered 20 minutes, or until easily flaked with a fork.",
          kcal: "265kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "60m",
          ingredients: ["1/4 cup maple syrup", "2 tablespoons soy sauce", "1 clove garlic, minced", "1/4 teaspoon garlic salt", "1/8 teaspoon ground black pepper", "1 pound salmon"]
        }, {
          name: "Angela's Awesome Enchiladas",
          description: "The secret is in the seasonings! I whipped these up on my own using stuff I had on hand. Shredding the chicken is the most time-consuming step, but it's worth it in the end. Give these babies a try! Serve with sour cream and a side of Spanish rice.",
          coverPhoto: "angela.jpg",
          recipe: "Place the chicken in a large pot and add water to cover. Bring to a boil over high heat, then reduce the heat to medium-low, cover, and simmer until the chicken pieces are no longer pink, about 10 minutes. Shred chicken by placing two forks back to back and pulling meat apart. Set the shredded chicken aside. Meanwhile, combine the cream of chicken soup, sour cream, and chili powder in a saucepan. Bring to a simmer over low heat, stirring occasionally, then turn off the heat and cover to keep warm. Heat the butter in a skillet over medium heat. Stir in the onion; cook and stir until the onion has softened and turned translucent, about 5 minutes. Add the shredded chicken, chopped green chilies, taco seasoning, half of the bunch of chopped green onion, and water. Allow to simmer for 10 minutes. Stir in the lime juice, onion powder, and garlic powder; simmer for an additional 10 minutes.",
          kcal: "709kcal",
          fat: "549g",
          proteins: "22g",
          carbs: "48g",
          time: "95m",
          ingredients: ["2 pounds skinless, boneless chicken breast meat - cut into chunks", "1 1/4 cups sour cream", "1 tablespoon butter", "1 small onion, chopped", "1 cup water", "1 teaspoon lime juice", "2 cups Cheddar cheese, shredded, divided"]
        }]
      },
      shoppingList: ["2 pounds of Rice", "3 pounds of Chicken Breasts ", "1 liter lime juice", "1 bottle of maple syrup", "2 bottle of soy sauce", "24 egg whites", "2 garlic ", "1 zucchini", "6 tomatoes", "12 kiwis", "1 white sugar", "1 bottle of Italian seasoning", "1 pound salmon", "1 bottle of sesame oil", "2 bread sticks", "5 Bananas"]
    }
  }, {
    name: "Katy Perry",
    coverPhoto: "katyperry.jpg",
    description: "Katheryn Elizabeth \"Katy\" Hudson (born October 25, 1984), known professionally as Katy Perry, is an American singer, songwriter, and actress. After singing in church during her childhood, she pursued a career in gospel music as a teenager. Perry signed with Red Hill Records and released her debut studio album Katy Hudson in 2001, which was commercially unsuccessful. She moved to Los Angeles the following year to venture into secular music after Red Hill ceased operations. After being dropped by The Island Def Jam Music Group and Columbia Records, Perry signed a recording contract with Capitol Records in April 2007.",
    diet: {
      name: "The M Plan Diet",
      description: "If you like mushrooms, then this is the diet for you. According to several sources, dieters on the M-Plan replace one meal each day with a mushroom-based meal. Apparently, the diet works better if the mushrooms are raw. Dieters stay on the diet for 14 days and voila! they have slimmer thighs and tinier waistlines but still maintain their cleavage.",
      nutritionalSummary: [{ label: "fats", value: 10 }, { label: "proteins", value: 70 }, { label: "carbs", value: 20 }],
      meals: {
        breakfast: [{
          name: "Grilled Peanut Butter and Banana Sandwich",
          description: "A sweet, warm breakfast idea. Cooked like a grilled cheese, but filled with melted peanut butter and warm bananas",
          coverPhoto: "banana.jpg",
          recipe: "Heat a skillet or griddle over medium heat, and coat with cooking spray. Spread 1 tablespoon of peanut butter onto one side of each slice of bread. Place banana slices onto the peanut buttered side of one slice, top with the other slice and press together firmly. Fry the sandwich until golden brown on each side, about 2 minutes per side.",
          kcal: "437kcal",
          fat: "18.7g",
          proteins: "16.8g",
          carbs: "56.8g",
          time: "12m",
          ingredients: ["1 cooking spray", "2 tablespoons peanut butter", "2 slices whole wheat bread", "1 banana, sliced"]
        }, {
          name: "Muesli",
          description: "This is a nutritious and delicious breakfast cereal. Use any type of dried fruit you desire! You can also use almonds in place of walnuts if you like. Wonderful when served in bowls with milk and fresh berries or sliced fresh fruit.",
          coverPhoto: "muesli.jpg",
          recipe: "In a large mixing bowl combine oats, wheat germ, wheat bran, oat bran, dried fruit, nuts, sugar, and seeds. Mix well. Store muesli in an airtight container. It keeps for 2 months at room temperature.",
          kcal: "188kcal",
          fat: "5.7g",
          proteins: "6.1g",
          carbs: "31.8g",
          time: "10m",
          ingredients: ["4 1/2 cups rolled oats", "1/2 cup toasted wheat germ", "1/2 cup wheat bran", "1/2 cup oat bran", "1 cup raisins", "1/2 cup chopped walnuts", "1/4 cup packed brown sugar", "1 cup raw sunflower seeds", "2 Girls"]
        }, {
          name: "Pumpkin Oatmeal",
          description: "A great way to get a serving of whole grains and a yellow vegetable in the morning!",
          coverPhoto: "breakfast3.jpg",
          recipe: "Mix together oats and milk in a microwave-safe bowl. Cook on high for 1 to 2 minutes, stirring once. Add more milk or oats to achieve the desired consistency, and cook for another 30 seconds. Stir in pumpkin puree, pumpkin pie spice, and cinnamon sugar. Heat through, and serve.",
          kcal: "229kcal",
          fat: "4.7g",
          proteins: "9.4g",
          carbs: "38.7g",
          time: "8m",
          ingredients: ["1 cup quick-cooking rolled oats", "3/4 cup milk, or as needed", "1/2 cup canned pumpkin puree", "1/4 teaspoon pumpkin pie spice", "1 teaspoon cinnamon sugar"]
        }],
        appetizer: [{
          name: "Extra Easy Hummus",
          description: "Tahini-free hummus that only takes minutes.",
          coverPhoto: "hummus.jpg",
          recipe: "appetizer1 Recipe",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "15m",
          ingredients: ["120g sugar", "250g bread", "200g chickpeans", "20ml Oil"]
        }, {
          name: "Very Easy Shrimp Dip",
          description: "Really cool dip with Shrimps and coolness",
          coverPhoto: "shrimpdip.jpg",
          recipe: "Spread the cream cheese on the bottom of a 8 inch square serving dish. Layer the shrimp over the cream cheese. Pour the cocktail sauce over the top.",
          kcal: "134kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "10m",
          ingredients: ["1 ounce Package Cream cheese", "1 ounce can small shrimp, drained", "1/2 ounce bottle cocktail sauce"]
        }, {
          name: "Artichoke & Spinach Dip Restaurant Style",
          description: "Supercool dip with artichoke and Spinach just ",
          coverPhoto: "artichoke.jpg",
          recipe: "Preheat oven to 350 degrees F (175 degrees C). Place garlic in a small baking dish. Bake in the preheated oven 20 to 30 minutes, until soft. Remove from heat. When cool enough to touch, squeeze softened garlic from skins. In an 8x8 inch baking dish, spread the roasted garlic, spinach, artichoke hearts, Alfredo-style pasta sauce, mozzarella cheese, Parmesan cheese, and cream cheese. Bake in the preheated oven 30 minutes, or until cheeses are melted and bubbly. Serve warm.",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "5m",
          ingredients: ["120g artichoke", "2 container Alfredo-style pasta sauce", "1 cup shredded mozzarella cheese", "1/3 cup grated Parmesan cheese"]
        }],
        lunch: [{
          name: "A Jerky Chicken",
          description: "A great Jamaican style dish. A spicy blend of herbs, vinegar, and a habanero pepper make this chicken dish unforgettable. Serve with rice, yum!",
          coverPhoto: "jerky.jpg",
          recipe: "lunch1 Recipe",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "75m",
          ingredients: ["1 teaspoon onion, finely chopped", "3 tablespoons brown sugar", "4 tablespoons soy sauce", "4 tablespoons red wine vinegar", "2 teaspoons chopped fresh thyme", "1 teaspoon sesame oil", "3 cloves garlic, chopped"]
        }, {
          name: "Simple Pasta Salad",
          description: "An easy, yet very yummy pasta salad. Almost any type of pasta may be used. Best if left to sit overnight.",
          coverPhoto: "pasta.jpg",
          recipe: "Bring a large pot of lightly salted water to a boil. Place pasta in the pot, cook for 8 to 12 minutes, until al dente, and drain. In a large bowl, toss the cooked pasta with the Italian dressing, cucumbers, tomatoes, and green onions. In a small bowl, mix the Parmesan cheese and Italian seasoning, and gently mix into the salad. Cover, and refrigerate until serving.",
          kcal: "289kcal",
          fat: "5g",
          proteins: "28g",
          carbs: "54g",
          ingredients: ["1 tablespoon Italian seasoning", "1 bunch green onions, chopped", "6 tomatoes, chopped", "2 cucumbers, chopped", "1 package uncooked rotini pasta"]
        }],
        snack: [{
          name: "Annie's Fruit Salsa and Cinnamon Chips",
          description: "Easy to make, tasty fruit salsa and cinnamon tortilla chips. Great as an appetizer or a snack. Great for anytime",
          coverPhoto: "annie.jpg",
          recipe: "In a large bowl, thoroughly mix kiwis, Golden Delicious apples, raspberries, strawberries, white sugar, brown sugar and fruit preserves. Cover and chill in the refrigerator at least 15 minutes.Preheat oven to 350 degrees F (175 degrees C). Coat one side of each flour tortilla with butter flavored cooking spray. Cut into wedges and arrange in a single layer on a large baking sheet. Sprinkle wedges with desired amount of cinnamon sugar. Spray again with cooking spray. Bake in the preheated oven 8 to 10 minutes. Repeat with any remaining tortilla wedges. Allow to cool approximately 15 minutes. Serve with chilled fruit mixture.",
          kcal: "312 kcal",
          fat: "5g",
          proteins: "68g",
          carbs: "59g",
          time: "25m",
          ingredients: ["1 kiwis, peeled and diced", "1 Golden Delicious apples - peeled, cored and diced", "1/4 pound raspberries", "1/2 pound strawberries", "1 tablespoon white sugar", "1-1/2 teaspoons brown sugar", "1 tablespoon and 1-1/2 teaspoons fruit preserves, any flavor", "5 (10 inch) flour tortillas", "butter flavored cooking spray", "1 tablespoon cinnamon sugar"]
        }, {
          name: "Baked Zucchini Chips",
          description: "A quick, healthy way to use some of that zucchini from your garden",
          coverPhoto: "zucchini.jpg",
          recipe: "1ºPreheat the oven to 475 degrees F (245 degrees C). 2ºIn one small bowl, stir together the bread crumbs, pepper and Parmesan cheese. Place the egg whites in a separate bowl. Dip zucchini slices into the egg whites, then coat the breadcrumb mixture. Place on a greased baking sheet. 3ºBake for 5 minutes in the preheated oven, then turn over and bake for another 5 to 10 minutes, until browned and crispy.",
          kcal: "92 kcal",
          fat: "1.7 g",
          proteins: "6.1 g",
          carbs: "13.8 g",
          time: "15 m",
          ingredients: ["1 medium zucchini, cut into 1/4-inch slices", "1/4 cup seasoned dry bread crumbs", "1/8 teaspoon ground black pepper", "1 tablespoon grated Parmesan cheese", "1 egg whites"]
        }],
        dinner: [{
          name: "Maple Salmon",
          description: "This is the best and most delicious salmon recipe, and very easy to prepare. I love maple in everything and put this together one night. My husband totally loved it; he did not like salmon that much until he had this.",
          coverPhoto: "maple.jpg",
          recipe: "In a small bowl, mix the maple syrup, soy sauce, garlic, garlic salt, and pepper. Place salmon in a shallow glass baking dish, and coat with the maple syrup mixture. Cover the dish, and marinate salmon in the refrigerator 30 minutes, turning once. Preheat oven to 400 degrees F (200 degrees C). Place the baking dish in the preheated oven, and bake salmon uncovered 20 minutes, or until easily flaked with a fork.",
          kcal: "265kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "60m",
          ingredients: ["1/4 cup maple syrup", "2 tablespoons soy sauce", "1 clove garlic, minced", "1/4 teaspoon garlic salt", "1/8 teaspoon ground black pepper", "1 pound salmon"]
        }, {
          name: "Angela's Awesome Enchiladas",
          description: "The secret is in the seasonings! I whipped these up on my own using stuff I had on hand. Shredding the chicken is the most time-consuming step, but it's worth it in the end. Give these babies a try! Serve with sour cream and a side of Spanish rice.",
          coverPhoto: "angela.jpg",
          recipe: "Place the chicken in a large pot and add water to cover. Bring to a boil over high heat, then reduce the heat to medium-low, cover, and simmer until the chicken pieces are no longer pink, about 10 minutes. Shred chicken by placing two forks back to back and pulling meat apart. Set the shredded chicken aside. Meanwhile, combine the cream of chicken soup, sour cream, and chili powder in a saucepan. Bring to a simmer over low heat, stirring occasionally, then turn off the heat and cover to keep warm. Heat the butter in a skillet over medium heat. Stir in the onion; cook and stir until the onion has softened and turned translucent, about 5 minutes. Add the shredded chicken, chopped green chilies, taco seasoning, half of the bunch of chopped green onion, and water. Allow to simmer for 10 minutes. Stir in the lime juice, onion powder, and garlic powder; simmer for an additional 10 minutes.",
          kcal: "709kcal",
          fat: "549g",
          proteins: "22g",
          carbs: "48g",
          time: "95m",
          ingredients: ["2 pounds skinless, boneless chicken breast meat - cut into chunks", "1 1/4 cups sour cream", "1 tablespoon butter", "1 small onion, chopped", "1 cup water", "1 teaspoon lime juice", "2 cups Cheddar cheese, shredded, divided"]
        }]
      },
      shoppingList: ["2 pounds of Rice", "3 pounds of Chicken Breasts ", "1 liter lime juice", "1 bottle of maple syrup", "2 bottle of soy sauce", "24 egg whites", "2 garlic ", "1 zucchini", "6 tomatoes", "12 kiwis", "1 white sugar", "1 bottle of Italian seasoning", "1 pound salmon", "1 bottle of sesame oil", "2 bread sticks", "5 Bananas"]
    }
  }, {
    name: "Megan Fox",
    coverPhoto: "megan-fox.jpg",
    description: "Megan Denise Fox (born May 16, 1986) is an American actress and model. She began her acting career in 2001, with several minor television and film roles, and played a regular role on the Hope & Faith television sitcom. In 2004, she made her film debut with a role in the teen comedy Confessions of a Teenage Drama Queen. In 2007, she co-starred as Mikaela Banes, the love interest of Shia LaBeouf's character, in the blockbuster action film Transformers, which became her breakout role. Fox reprised her role in the 2009 sequel, Transformers: Revenge of the Fallen. Later in 2009, she starred as the eponymous lead in the black comedy horror film Jennifer's Body. Fox is also considered one of the modern female sex symbols and has appeared in magazines such as Maxim, Rolling Stone and FHM.",
    diet: {
      name: "The 5-Factor Diet",
      description: "You won't go hungry on The 5-Factor Diet. Creator and celebrity fitness trainer Harley Pasternak says it's a lifestyle plan, not a diet. Each part of the plan revolves around the number five. You’ll prepare and eat five, 5-ingredient meals a day (each takes 5 minutes to prepare) and do 25-minute workouts (consisting of five, 5-minute segments) five times a week. Pasternak promises that eating a balanced meal five times a day will keep your blood sugar low and stable. This helps your mood and gives you energy all day long.",
      nutritionalSummary: [{ label: "fats", value: 20 }, { label: "proteins", value: 40 }, { label: "carbs", value: 40 }],
      meals: {
        breakfast: [{
          name: "Grilled Peanut Butter and Banana Sandwich",
          description: "A sweet, warm breakfast idea. Cooked like a grilled cheese, but filled with melted peanut butter and warm bananas",
          coverPhoto: "banana.jpg",
          recipe: "Heat a skillet or griddle over medium heat, and coat with cooking spray. Spread 1 tablespoon of peanut butter onto one side of each slice of bread. Place banana slices onto the peanut buttered side of one slice, top with the other slice and press together firmly. Fry the sandwich until golden brown on each side, about 2 minutes per side.",
          kcal: "437kcal",
          fat: "18.7g",
          proteins: "16.8g",
          carbs: "56.8g",
          time: "12m",
          ingredients: ["1 cooking spray", "2 tablespoons peanut butter", "2 slices whole wheat bread", "1 banana, sliced"]
        }, {
          name: "Muesli",
          description: "This is a nutritious and delicious breakfast cereal. Use any type of dried fruit you desire! You can also use almonds in place of walnuts if you like. Wonderful when served in bowls with milk and fresh berries or sliced fresh fruit.",
          coverPhoto: "muesli.jpg",
          recipe: "In a large mixing bowl combine oats, wheat germ, wheat bran, oat bran, dried fruit, nuts, sugar, and seeds. Mix well. Store muesli in an airtight container. It keeps for 2 months at room temperature.",
          kcal: "188kcal",
          fat: "5.7g",
          proteins: "6.1g",
          carbs: "31.8g",
          time: "10m",
          ingredients: ["4 1/2 cups rolled oats", "1/2 cup toasted wheat germ", "1/2 cup wheat bran", "1/2 cup oat bran", "1 cup raisins", "1/2 cup chopped walnuts", "1/4 cup packed brown sugar", "1 cup raw sunflower seeds", "2 Girls"]
        }, {
          name: "Pumpkin Oatmeal",
          description: "A great way to get a serving of whole grains and a yellow vegetable in the morning!",
          coverPhoto: "breakfast3.jpg",
          recipe: "Mix together oats and milk in a microwave-safe bowl. Cook on high for 1 to 2 minutes, stirring once. Add more milk or oats to achieve the desired consistency, and cook for another 30 seconds. Stir in pumpkin puree, pumpkin pie spice, and cinnamon sugar. Heat through, and serve.",
          kcal: "229kcal",
          fat: "4.7g",
          proteins: "9.4g",
          carbs: "38.7g",
          time: "8m",
          ingredients: ["1 cup quick-cooking rolled oats", "3/4 cup milk, or as needed", "1/2 cup canned pumpkin puree", "1/4 teaspoon pumpkin pie spice", "1 teaspoon cinnamon sugar"]
        }],
        appetizer: [{
          name: "Extra Easy Hummus",
          description: "Tahini-free hummus that only takes minutes.",
          coverPhoto: "hummus.jpg",
          recipe: "appetizer1 Recipe",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "15m",
          ingredients: ["120g sugar", "250g bread", "200g chickpeans", "20ml Oil"]
        }, {
          name: "Very Easy Shrimp Dip",
          description: "Really cool dip with Shrimps and coolness",
          coverPhoto: "shrimpdip.jpg",
          recipe: "Spread the cream cheese on the bottom of a 8 inch square serving dish. Layer the shrimp over the cream cheese. Pour the cocktail sauce over the top.",
          kcal: "134kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "10m",
          ingredients: ["1 ounce Package Cream cheese", "1 ounce can small shrimp, drained", "1/2 ounce bottle cocktail sauce"]
        }, {
          name: "Artichoke & Spinach Dip Restaurant Style",
          description: "Supercool dip with artichoke and Spinach just ",
          coverPhoto: "artichoke.jpg",
          recipe: "Preheat oven to 350 degrees F (175 degrees C). Place garlic in a small baking dish. Bake in the preheated oven 20 to 30 minutes, until soft. Remove from heat. When cool enough to touch, squeeze softened garlic from skins. In an 8x8 inch baking dish, spread the roasted garlic, spinach, artichoke hearts, Alfredo-style pasta sauce, mozzarella cheese, Parmesan cheese, and cream cheese. Bake in the preheated oven 30 minutes, or until cheeses are melted and bubbly. Serve warm.",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "5m",
          ingredients: ["120g artichoke", "2 container Alfredo-style pasta sauce", "1 cup shredded mozzarella cheese", "1/3 cup grated Parmesan cheese"]
        }],
        lunch: [{
          name: "A Jerky Chicken",
          description: "A great Jamaican style dish. A spicy blend of herbs, vinegar, and a habanero pepper make this chicken dish unforgettable. Serve with rice, yum!",
          coverPhoto: "jerky.jpg",
          recipe: "lunch1 Recipe",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "75m",
          ingredients: ["1 teaspoon onion, finely chopped", "3 tablespoons brown sugar", "4 tablespoons soy sauce", "4 tablespoons red wine vinegar", "2 teaspoons chopped fresh thyme", "1 teaspoon sesame oil", "3 cloves garlic, chopped"]
        }, {
          name: "Simple Pasta Salad",
          description: "An easy, yet very yummy pasta salad. Almost any type of pasta may be used. Best if left to sit overnight.",
          coverPhoto: "pasta.jpg",
          recipe: "Bring a large pot of lightly salted water to a boil. Place pasta in the pot, cook for 8 to 12 minutes, until al dente, and drain. In a large bowl, toss the cooked pasta with the Italian dressing, cucumbers, tomatoes, and green onions. In a small bowl, mix the Parmesan cheese and Italian seasoning, and gently mix into the salad. Cover, and refrigerate until serving.",
          kcal: "289kcal",
          fat: "5g",
          proteins: "28g",
          carbs: "54g",
          ingredients: ["1 tablespoon Italian seasoning", "1 bunch green onions, chopped", "6 tomatoes, chopped", "2 cucumbers, chopped", "1 package uncooked rotini pasta"]
        }],
        snack: [{
          name: "Annie's Fruit Salsa and Cinnamon Chips",
          description: "Easy to make, tasty fruit salsa and cinnamon tortilla chips. Great as an appetizer or a snack. Great for anytime",
          coverPhoto: "annie.jpg",
          recipe: "In a large bowl, thoroughly mix kiwis, Golden Delicious apples, raspberries, strawberries, white sugar, brown sugar and fruit preserves. Cover and chill in the refrigerator at least 15 minutes.Preheat oven to 350 degrees F (175 degrees C). Coat one side of each flour tortilla with butter flavored cooking spray. Cut into wedges and arrange in a single layer on a large baking sheet. Sprinkle wedges with desired amount of cinnamon sugar. Spray again with cooking spray. Bake in the preheated oven 8 to 10 minutes. Repeat with any remaining tortilla wedges. Allow to cool approximately 15 minutes. Serve with chilled fruit mixture.",
          kcal: "312 kcal",
          fat: "5g",
          proteins: "68g",
          carbs: "59g",
          time: "25m",
          ingredients: ["1 kiwis, peeled and diced", "1 Golden Delicious apples - peeled, cored and diced", "1/4 pound raspberries", "1/2 pound strawberries", "1 tablespoon white sugar", "1-1/2 teaspoons brown sugar", "1 tablespoon and 1-1/2 teaspoons fruit preserves, any flavor", "5 (10 inch) flour tortillas", "butter flavored cooking spray", "1 tablespoon cinnamon sugar"]
        }, {
          name: "Baked Zucchini Chips",
          description: "A quick, healthy way to use some of that zucchini from your garden",
          coverPhoto: "zucchini.jpg",
          recipe: "1ºPreheat the oven to 475 degrees F (245 degrees C). 2ºIn one small bowl, stir together the bread crumbs, pepper and Parmesan cheese. Place the egg whites in a separate bowl. Dip zucchini slices into the egg whites, then coat the breadcrumb mixture. Place on a greased baking sheet. 3ºBake for 5 minutes in the preheated oven, then turn over and bake for another 5 to 10 minutes, until browned and crispy.",
          kcal: "92 kcal",
          fat: "1.7 g",
          proteins: "6.1 g",
          carbs: "13.8 g",
          time: "15 m",
          ingredients: ["1 medium zucchini, cut into 1/4-inch slices", "1/4 cup seasoned dry bread crumbs", "1/8 teaspoon ground black pepper", "1 tablespoon grated Parmesan cheese", "1 egg whites"]
        }],
        dinner: [{
          name: "Maple Salmon",
          description: "This is the best and most delicious salmon recipe, and very easy to prepare. I love maple in everything and put this together one night. My husband totally loved it; he did not like salmon that much until he had this.",
          coverPhoto: "maple.jpg",
          recipe: "In a small bowl, mix the maple syrup, soy sauce, garlic, garlic salt, and pepper. Place salmon in a shallow glass baking dish, and coat with the maple syrup mixture. Cover the dish, and marinate salmon in the refrigerator 30 minutes, turning once. Preheat oven to 400 degrees F (200 degrees C). Place the baking dish in the preheated oven, and bake salmon uncovered 20 minutes, or until easily flaked with a fork.",
          kcal: "265kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "60m",
          ingredients: ["1/4 cup maple syrup", "2 tablespoons soy sauce", "1 clove garlic, minced", "1/4 teaspoon garlic salt", "1/8 teaspoon ground black pepper", "1 pound salmon"]
        }, {
          name: "Angela's Awesome Enchiladas",
          description: "The secret is in the seasonings! I whipped these up on my own using stuff I had on hand. Shredding the chicken is the most time-consuming step, but it's worth it in the end. Give these babies a try! Serve with sour cream and a side of Spanish rice.",
          coverPhoto: "angela.jpg",
          recipe: "Place the chicken in a large pot and add water to cover. Bring to a boil over high heat, then reduce the heat to medium-low, cover, and simmer until the chicken pieces are no longer pink, about 10 minutes. Shred chicken by placing two forks back to back and pulling meat apart. Set the shredded chicken aside. Meanwhile, combine the cream of chicken soup, sour cream, and chili powder in a saucepan. Bring to a simmer over low heat, stirring occasionally, then turn off the heat and cover to keep warm. Heat the butter in a skillet over medium heat. Stir in the onion; cook and stir until the onion has softened and turned translucent, about 5 minutes. Add the shredded chicken, chopped green chilies, taco seasoning, half of the bunch of chopped green onion, and water. Allow to simmer for 10 minutes. Stir in the lime juice, onion powder, and garlic powder; simmer for an additional 10 minutes.",
          kcal: "709kcal",
          fat: "549g",
          proteins: "22g",
          carbs: "48g",
          time: "95m",
          ingredients: ["2 pounds skinless, boneless chicken breast meat - cut into chunks", "1 1/4 cups sour cream", "1 tablespoon butter", "1 small onion, chopped", "1 cup water", "1 teaspoon lime juice", "2 cups Cheddar cheese, shredded, divided"]
        }]
      },
      shoppingList: ["2 pounds of Rice", "3 pounds of Chicken Breasts ", "1 liter lime juice", "1 bottle of maple syrup", "2 bottle of soy sauce", "24 egg whites", "2 garlic ", "1 zucchini", "6 tomatoes", "12 kiwis", "1 white sugar", "1 bottle of Italian seasoning", "1 pound salmon", "1 bottle of sesame oil", "2 bread sticks", "5 Bananas"]
    }
  }, {
    name: "Spanish Politician",
    coverPhoto: "rajoy.jpg",
    description: "Politicos españoles...",
    diet: {
      name: "Politician Diet",
      description: "La popular dieta del chorizo, también conocida como La Gran Mamandurria es una dieta popularizada por los políticos durante los últimos dos siglos en España.",
      nutritionalSummary: [{ label: "fats", value: 60 }, { label: "proteins", value: 20 }, { label: "carbs", value: 20 }],
      meals: {
        breakfast: [{
          name: "Chorizo Parrillero",
          description: "Chorizos frescos para desayunar",
          coverPhoto: "parrillero.jpg",
          recipe: "Chorizo vuelta y vuelta en la parrilla, rico rico.",
          kcal: "2157kcal",
          fat: "18.7g",
          proteins: "16.8g",
          carbs: "56.8g",
          time: "12m",
          ingredients: ["Chorizo (A elección)", "Parrilla"]
        }],
        appetizer: [{
          name: "Chorizo Criollo",
          description: "A media mañana, pa seguir choriceando...",
          coverPhoto: "criollo.jpg",
          recipe: "Acercas un sobre al chorizo... y se calienta sólo!",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "15m",
          ingredients: ["25g chorizo", "1 Sobre"]
        }],
        lunch: [{
          name: "Chorizo Parrillero",
          description: "El mismo que por la mañana... repetimos",
          coverPhoto: "parrillero.jpg",
          recipe: "Chorizo vuelta y vuelta en la parrilla, rico rico.",
          kcal: "2157kcal",
          fat: "18.7g",
          proteins: "16.8g",
          carbs: "56.8g",
          time: "12m",
          ingredients: ["Chorizo (A elección)", "Parrilla"]
        }],
        snack: [{
          name: "Chorizo al pacto",
          description: "El chorizo más amigable",
          coverPhoto: "criollo.jpg",
          recipe: "Porque Podemos hacerlo, siempre es buen momento para que un buen Ciudadano disfrute del Popular chorizo al pacto. ",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "15m",
          ingredients: ["25g Chorizos Ciudadanos", "50g Chorizo Podemos", "33g Chorizos Populares", "24g Chorizos Socialistas"]
        }],
        dinner: [{
          name: "Chorizo Parrillero",
          description: "El mismo que por la mañana... pero por la noche",
          coverPhoto: "parrillero.jpg",
          recipe: "Chorizo vuelta y vuelta en la parrilla, rico rico.",
          kcal: "2157kcal",
          fat: "18.7g",
          proteins: "16.8g",
          carbs: "56.8g",
          time: "12m",
          ingredients: ["Chorizo (A elección)", "Parrilla"]
        }]
      },
      shoppingList: ["1 Chorizo Ciudadano", "2 chorizos Socialistas", "3 chorizos Podemitas", "4 chorizos Populares"]
    }
  }, {
    name: "Christina Aguilera",
    coverPhoto: "aguilera.jpg",
    description: "Christina María Aguilera (born December 18, 1980) is an American singer-songwriter and actress. In the early 1990s, she appeared on television series Star Search and The Mickey Mouse Club. In 1998, Aguilera signed with RCA Records and recorded her self-titled debut album, which was released in 1999. The album was a commercial success in the United States, spawning three U.S. Billboard Hot 100 number-one singles—\"Genie in a Bottle. What a Girl Wants\", and \"Come On Over Baby (All I Want Is You)\", and helped Aguilera win the Grammy Award for Best New Artist. In 2000, RCA released Aguilera's Spanish-language album Mi Reflejo and holiday-theme album My Kind of Christmas. Her 2002 fourth studio album, Stripped, ventured into various genres including hip hop, Latin, and rock, and won a Grammy Award for Best Female Pop Vocal Performance for its second single \"Beautiful\".",
    diet: {
      name: "The Fresh Diet",
      description: "At its core, a Mediterranean diet focuses on deriving deep flavor from fresh ingredients—like fruits, vegetables, legumes, whole grains and healthy and monounsaturated fats like olive oil, nuts, avocados and fish.",
      nutritionalSummary: [{ label: "fats", value: 10 }, { label: "proteins", value: 40 }, { label: "carbs", value: 50 }],
      meals: {
        breakfast: [{
          name: "Grilled Peanut Butter and Banana Sandwich",
          description: "A sweet, warm breakfast idea. Cooked like a grilled cheese, but filled with melted peanut butter and warm bananas",
          coverPhoto: "banana.jpg",
          recipe: "Heat a skillet or griddle over medium heat, and coat with cooking spray. Spread 1 tablespoon of peanut butter onto one side of each slice of bread. Place banana slices onto the peanut buttered side of one slice, top with the other slice and press together firmly. Fry the sandwich until golden brown on each side, about 2 minutes per side.",
          kcal: "437kcal",
          fat: "18.7g",
          proteins: "16.8g",
          carbs: "56.8g",
          time: "12m",
          ingredients: ["1 cooking spray", "2 tablespoons peanut butter", "2 slices whole wheat bread", "1 banana, sliced"]
        }, {
          name: "Muesli",
          description: "This is a nutritious and delicious breakfast cereal. Use any type of dried fruit you desire! You can also use almonds in place of walnuts if you like. Wonderful when served in bowls with milk and fresh berries or sliced fresh fruit.",
          coverPhoto: "muesli.jpg",
          recipe: "In a large mixing bowl combine oats, wheat germ, wheat bran, oat bran, dried fruit, nuts, sugar, and seeds. Mix well. Store muesli in an airtight container. It keeps for 2 months at room temperature.",
          kcal: "188kcal",
          fat: "5.7g",
          proteins: "6.1g",
          carbs: "31.8g",
          time: "10m",
          ingredients: ["4 1/2 cups rolled oats", "1/2 cup toasted wheat germ", "1/2 cup wheat bran", "1/2 cup oat bran", "1 cup raisins", "1/2 cup chopped walnuts", "1/4 cup packed brown sugar", "1 cup raw sunflower seeds", "2 Girls"]
        }, {
          name: "Pumpkin Oatmeal",
          description: "A great way to get a serving of whole grains and a yellow vegetable in the morning!",
          coverPhoto: "breakfast3.jpg",
          recipe: "Mix together oats and milk in a microwave-safe bowl. Cook on high for 1 to 2 minutes, stirring once. Add more milk or oats to achieve the desired consistency, and cook for another 30 seconds. Stir in pumpkin puree, pumpkin pie spice, and cinnamon sugar. Heat through, and serve.",
          kcal: "229kcal",
          fat: "4.7g",
          proteins: "9.4g",
          carbs: "38.7g",
          time: "8m",
          ingredients: ["1 cup quick-cooking rolled oats", "3/4 cup milk, or as needed", "1/2 cup canned pumpkin puree", "1/4 teaspoon pumpkin pie spice", "1 teaspoon cinnamon sugar"]
        }],
        appetizer: [{
          name: "Extra Easy Hummus",
          description: "Tahini-free hummus that only takes minutes.",
          coverPhoto: "hummus.jpg",
          recipe: "appetizer1 Recipe",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "15m",
          ingredients: ["120g sugar", "250g bread", "200g chickpeans", "20ml Oil"]
        }, {
          name: "Very Easy Shrimp Dip",
          description: "Really cool dip with Shrimps and coolness",
          coverPhoto: "shrimpdip.jpg",
          recipe: "Spread the cream cheese on the bottom of a 8 inch square serving dish. Layer the shrimp over the cream cheese. Pour the cocktail sauce over the top.",
          kcal: "134kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "10m",
          ingredients: ["1 ounce Package Cream cheese", "1 ounce can small shrimp, drained", "1/2 ounce bottle cocktail sauce"]
        }, {
          name: "Artichoke & Spinach Dip Restaurant Style",
          description: "Supercool dip with artichoke and Spinach just ",
          coverPhoto: "artichoke.jpg",
          recipe: "Preheat oven to 350 degrees F (175 degrees C). Place garlic in a small baking dish. Bake in the preheated oven 20 to 30 minutes, until soft. Remove from heat. When cool enough to touch, squeeze softened garlic from skins. In an 8x8 inch baking dish, spread the roasted garlic, spinach, artichoke hearts, Alfredo-style pasta sauce, mozzarella cheese, Parmesan cheese, and cream cheese. Bake in the preheated oven 30 minutes, or until cheeses are melted and bubbly. Serve warm.",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "5m",
          ingredients: ["120g artichoke", "2 container Alfredo-style pasta sauce", "1 cup shredded mozzarella cheese", "1/3 cup grated Parmesan cheese"]
        }],
        lunch: [{
          name: "A Jerky Chicken",
          description: "A great Jamaican style dish. A spicy blend of herbs, vinegar, and a habanero pepper make this chicken dish unforgettable. Serve with rice, yum!",
          coverPhoto: "jerky.jpg",
          recipe: "lunch1 Recipe",
          kcal: "245kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "75m",
          ingredients: ["1 teaspoon onion, finely chopped", "3 tablespoons brown sugar", "4 tablespoons soy sauce", "4 tablespoons red wine vinegar", "2 teaspoons chopped fresh thyme", "1 teaspoon sesame oil", "3 cloves garlic, chopped"]
        }, {
          name: "Simple Pasta Salad",
          description: "An easy, yet very yummy pasta salad. Almost any type of pasta may be used. Best if left to sit overnight.",
          coverPhoto: "pasta.jpg",
          recipe: "Bring a large pot of lightly salted water to a boil. Place pasta in the pot, cook for 8 to 12 minutes, until al dente, and drain. In a large bowl, toss the cooked pasta with the Italian dressing, cucumbers, tomatoes, and green onions. In a small bowl, mix the Parmesan cheese and Italian seasoning, and gently mix into the salad. Cover, and refrigerate until serving.",
          kcal: "289kcal",
          fat: "5g",
          proteins: "28g",
          carbs: "54g",
          ingredients: ["1 tablespoon Italian seasoning", "1 bunch green onions, chopped", "6 tomatoes, chopped", "2 cucumbers, chopped", "1 package uncooked rotini pasta"]
        }],
        snack: [{
          name: "Annie's Fruit Salsa and Cinnamon Chips",
          description: "Easy to make, tasty fruit salsa and cinnamon tortilla chips. Great as an appetizer or a snack. Great for anytime",
          coverPhoto: "annie.jpg",
          recipe: "In a large bowl, thoroughly mix kiwis, Golden Delicious apples, raspberries, strawberries, white sugar, brown sugar and fruit preserves. Cover and chill in the refrigerator at least 15 minutes.Preheat oven to 350 degrees F (175 degrees C). Coat one side of each flour tortilla with butter flavored cooking spray. Cut into wedges and arrange in a single layer on a large baking sheet. Sprinkle wedges with desired amount of cinnamon sugar. Spray again with cooking spray. Bake in the preheated oven 8 to 10 minutes. Repeat with any remaining tortilla wedges. Allow to cool approximately 15 minutes. Serve with chilled fruit mixture.",
          kcal: "312 kcal",
          fat: "5g",
          proteins: "68g",
          carbs: "59g",
          time: "25m",
          ingredients: ["1 kiwis, peeled and diced", "1 Golden Delicious apples - peeled, cored and diced", "1/4 pound raspberries", "1/2 pound strawberries", "1 tablespoon white sugar", "1-1/2 teaspoons brown sugar", "1 tablespoon and 1-1/2 teaspoons fruit preserves, any flavor", "5 (10 inch) flour tortillas", "butter flavored cooking spray", "1 tablespoon cinnamon sugar"]
        }, {
          name: "Baked Zucchini Chips",
          description: "A quick, healthy way to use some of that zucchini from your garden",
          coverPhoto: "zucchini.jpg",
          recipe: "1ºPreheat the oven to 475 degrees F (245 degrees C). 2ºIn one small bowl, stir together the bread crumbs, pepper and Parmesan cheese. Place the egg whites in a separate bowl. Dip zucchini slices into the egg whites, then coat the breadcrumb mixture. Place on a greased baking sheet. 3ºBake for 5 minutes in the preheated oven, then turn over and bake for another 5 to 10 minutes, until browned and crispy.",
          kcal: "92 kcal",
          fat: "1.7 g",
          proteins: "6.1 g",
          carbs: "13.8 g",
          time: "15 m",
          ingredients: ["1 medium zucchini, cut into 1/4-inch slices", "1/4 cup seasoned dry bread crumbs", "1/8 teaspoon ground black pepper", "1 tablespoon grated Parmesan cheese", "1 egg whites"]
        }],
        dinner: [{
          name: "Maple Salmon",
          description: "This is the best and most delicious salmon recipe, and very easy to prepare. I love maple in everything and put this together one night. My husband totally loved it; he did not like salmon that much until he had this.",
          coverPhoto: "maple.jpg",
          recipe: "In a small bowl, mix the maple syrup, soy sauce, garlic, garlic salt, and pepper. Place salmon in a shallow glass baking dish, and coat with the maple syrup mixture. Cover the dish, and marinate salmon in the refrigerator 30 minutes, turning once. Preheat oven to 400 degrees F (200 degrees C). Place the baking dish in the preheated oven, and bake salmon uncovered 20 minutes, or until easily flaked with a fork.",
          kcal: "265kcal",
          fat: "25g",
          proteins: "35g",
          carbs: "34g",
          time: "60m",
          ingredients: ["1/4 cup maple syrup", "2 tablespoons soy sauce", "1 clove garlic, minced", "1/4 teaspoon garlic salt", "1/8 teaspoon ground black pepper", "1 pound salmon"]
        }, {
          name: "Angela's Awesome Enchiladas",
          description: "The secret is in the seasonings! I whipped these up on my own using stuff I had on hand. Shredding the chicken is the most time-consuming step, but it's worth it in the end. Give these babies a try! Serve with sour cream and a side of Spanish rice.",
          coverPhoto: "angela.jpg",
          recipe: "Place the chicken in a large pot and add water to cover. Bring to a boil over high heat, then reduce the heat to medium-low, cover, and simmer until the chicken pieces are no longer pink, about 10 minutes. Shred chicken by placing two forks back to back and pulling meat apart. Set the shredded chicken aside. Meanwhile, combine the cream of chicken soup, sour cream, and chili powder in a saucepan. Bring to a simmer over low heat, stirring occasionally, then turn off the heat and cover to keep warm. Heat the butter in a skillet over medium heat. Stir in the onion; cook and stir until the onion has softened and turned translucent, about 5 minutes. Add the shredded chicken, chopped green chilies, taco seasoning, half of the bunch of chopped green onion, and water. Allow to simmer for 10 minutes. Stir in the lime juice, onion powder, and garlic powder; simmer for an additional 10 minutes.",
          kcal: "709kcal",
          fat: "549g",
          proteins: "22g",
          carbs: "48g",
          time: "95m",
          ingredients: ["2 pounds skinless, boneless chicken breast meat - cut into chunks", "1 1/4 cups sour cream", "1 tablespoon butter", "1 small onion, chopped", "1 cup water", "1 teaspoon lime juice", "2 cups Cheddar cheese, shredded, divided"]
        }]
      },
      shoppingList: ["2 pounds of Rice", "3 pounds of Chicken Breasts ", "1 liter lime juice", "1 bottle of maple syrup", "2 bottle of soy sauce", "24 egg whites", "2 garlic ", "1 zucchini", "6 tomatoes", "12 kiwis", "1 white sugar", "1 bottle of Italian seasoning", "1 pound salmon", "1 bottle of sesame oil", "2 bread sticks", "5 Bananas"]
    }
  }, { "name": "Elsa Pataky", coverPhoto: "elsa.jpg", premium: true }, { "name": "Karmele", coverPhoto: "karmele.jpg", premium: true }, { "name": "Sara Carbonero", coverPhoto: "saracarbonero.jpg", premium: true }, { "name": "Scarlett Johansson", coverPhoto: "scarlett.jpg", premium: true }]
};

},{}],117:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactAddonsCssTransitionGroup = require('react-addons-css-transition-group');

var _reactAddonsCssTransitionGroup2 = _interopRequireDefault(_reactAddonsCssTransitionGroup);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _touchstonejs = require('touchstonejs');

// App Config
// ------------------------------

var PeopleStore = require('./stores/people');
var peopleStore = new PeopleStore();

var App = _react2['default'].createClass({
  displayName: 'App',

  mixins: [(0, _touchstonejs.createApp)()],

  childContextTypes: {
    peopleStore: _react2['default'].PropTypes.object
  },

  getChildContext: function getChildContext() {
    return {
      peopleStore: peopleStore
    };
  },

  componentDidMount: function componentDidMount() {
    // Hide the splash screen when the app is mounted
    if (navigator.splashscreen) {
      navigator.splashscreen.hide();
    }
  },

  render: function render() {
    var appWrapperClassName = 'app-wrapper device--' + (window.device || {}).platform;

    return _react2['default'].createElement(
      'div',
      { className: appWrapperClassName },
      _react2['default'].createElement(
        'div',
        { className: 'device-silhouette' },
        _react2['default'].createElement(
          _touchstonejs.ViewManager,
          { name: 'app', defaultView: 'main' },
          _react2['default'].createElement(_touchstonejs.View, { name: 'main', component: MainViewController })
        )
      )
    );
  }
});

// Main Controller
// ------------------------------

//var lastSelectedTab = localStorage.lastSelectedTab || 'celebrities';
var lastSelectedTab = 'celebrities';

var MainViewController = _react2['default'].createClass({
  displayName: 'MainViewController',

  onViewChange: function onViewChange(nextView) {
    lastSelectedTab = nextView;
    localStorage.lastSelectedTab = lastSelectedTab;
  },

  render: function render() {
    return _react2['default'].createElement(
      _touchstonejs.Container,
      null,
      _react2['default'].createElement(_touchstonejs.UI.NavigationBar, { name: 'main' }),
      _react2['default'].createElement(
        _touchstonejs.ViewManager,
        { name: 'tabs', defaultView: lastSelectedTab, onViewChange: this.onViewChange },
        _react2['default'].createElement(_touchstonejs.View, { name: 'celebrities', component: require('./views/celebrities') }),
        _react2['default'].createElement(_touchstonejs.View, { name: 'celebrity', component: require('./views/celebrity') }),
        _react2['default'].createElement(_touchstonejs.View, { name: 'recipes', component: require('./views/recipes') }),
        _react2['default'].createElement(_touchstonejs.View, { name: 'recipes-2', component: require('./views/recipes-2') }),
        _react2['default'].createElement(_touchstonejs.View, { name: 'recipe', component: require('./views/recipe') }),
        _react2['default'].createElement(_touchstonejs.View, { name: 'shopping-list', component: require('./views/shopping-list') }),
        _react2['default'].createElement(_touchstonejs.View, { name: 'subscribe', component: require('./views/subscribe') })
      )
    );
  }
});

function startApp() {
  if (window.StatusBar) {
    window.StatusBar.styleDefault();
  }
  _reactDom2['default'].render(_react2['default'].createElement(App, null), document.getElementById('app'));
}

if (!window.cordova) {
  startApp();
} else {
  document.addEventListener('deviceready', startApp, false);
}

},{"./stores/people":118,"./views/celebrities":119,"./views/celebrity":120,"./views/recipe":121,"./views/recipes":123,"./views/recipes-2":122,"./views/shopping-list":124,"./views/subscribe":125,"react":undefined,"react-addons-css-transition-group":undefined,"react-dom":undefined,"touchstonejs":74}],118:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var EventEmitter = require('events').EventEmitter;

var async = require('async');
var httpify = require('httpify');

var apiUrl = window.location.protocol === 'https:' ? 'https://randomuser.me/api?nat=au&results=16' : 'http://api.randomuser.me/?nat=au&results=16';

function PeopleStore() {
	EventEmitter.call(this);

	// initialize internal cache
	var storage = this.cache = {
		people: []
	};
	var self = this;

	// Dispatchers
	this.starQueue = async.queue(function (data, callback) {
		var id = data.id;
		var starred = data.starred;

		// update internal data
		self.cache.people.filter(function (person) {
			return person.id === id;
		}).forEach(function (person) {
			return person.isStarred = starred;
		});

		// emit events
		self.emit('people-updated', storage.people);

		callback();
	}, 1);

	this.refreshQueue = async.queue(function (_, callback) {
		// update
		httpify({
			method: 'GET',
			url: apiUrl
		}, function (err, res) {
			if (err) return callback(err);

			storage.people = res.body.results.map(function (p) {
				return p.user;
			});

			// post process new data
			storage.people.forEach(function (person, i) {
				person.id = i;
				person.name.first = person.name.first[0].toUpperCase() + person.name.first.slice(1);
				person.name.last = person.name.last[0].toUpperCase() + person.name.last.slice(1);
				person.name.initials = person.name.first[0] + person.name.last[0];
				person.name.full = person.name.first + ' ' + person.name.last;
				person.category = Math.random() > 0.5 ? 'A' : 'B';
				person.github = person.name.first.toLowerCase() + person.name.last.toLowerCase();
				person.picture = person.picture.medium;
				person.twitter = '@' + person.name.first.toLowerCase() + Math.random().toString(32).slice(2, 5);
			});

			// emit events
			self.emit('people-updated', storage.people);
			self.emit('refresh');

			callback(null, storage.people);
		});
	}, 1);

	// refresh immediately
	this.refresh();
}

_extends(PeopleStore.prototype, EventEmitter.prototype);

// Intents
PeopleStore.prototype.refresh = function (callback) {
	this.refreshQueue.push(null, callback);
};

PeopleStore.prototype.star = function (_ref, starred, callback) {
	var id = _ref.id;

	this.starQueue.push({ id: id, starred: starred }, callback);
};

// Getters
PeopleStore.prototype.getPeople = function () {
	return this.cache.people;
};

module.exports = PeopleStore;

},{"async":1,"events":6,"httpify":9}],119:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _touchstonejs = require('touchstonejs');

var data = require("../../data/data");

module.exports = _react2['default'].createClass({
  displayName: 'exports',

  statics: {
    navigationBar: 'main',
    getNavigation: function getNavigation() {
      return {
        title: 'Celebrities'
      };
    }
  },

  renderCelebrity: function renderCelebrity(celebrity, index) {

    var linkToParams = celebrity.premium ? { to: "tabs:subscribe", transition: "show-from-right" } : { to: "tabs:celebrity", transition: "show-from-right", viewProps: { celebrity: celebrity } };

    return _react2['default'].createElement(
      'div',
      { className: 'celebrities-item', key: index },
      _react2['default'].createElement(
        _touchstonejs.Link,
        linkToParams,
        _react2['default'].createElement(
          _touchstonejs.UI.Item,
          { showDisclosureArrow: true },
          _react2['default'].createElement(
            'div',
            { className: 'cover-photo', style: { backgroundImage: 'url(img/data/' + celebrity.coverPhoto + ')' } },
            _react2['default'].createElement(
              'div',
              { className: 'name' },
              celebrity.name
            ),
            celebrity.premium ? _react2['default'].createElement(
              'div',
              { className: 'premium-badge' },
              'Premium'
            ) : ""
          )
        )
      )
    );
  },

  render: function render() {
    var _this = this;

    return _react2['default'].createElement(
      _reactContainer2['default'],
      { scrollable: true, className: 'celebrities' },
      data.celebrities.map(function (celebrity, index) {
        return _this.renderCelebrity(celebrity, index);
      })
    );
  }
});

},{"../../data/data":116,"react":undefined,"react-container":undefined,"touchstonejs":74}],120:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _touchstonejs = require('touchstonejs');

var data = require("../../data/data");
var PieChart = require('react-d3').PieChart;

module.exports = _react2['default'].createClass({
	displayName: 'exports',

	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation(props, app) {
			return {
				title: "Diet",
				leftLabel: 'Celebrities',
				leftArrow: true,
				leftAction: function leftAction() {
					app.transitionTo('tabs:celebrities', { transition: 'reveal-from-right' });
				}
			};
		}
	},

	renderCelebrity: function renderCelebrity(celebrity, index) {
		return _react2['default'].createElement(
			_touchstonejs.Link,
			{ to: 'tabs:diet', transition: 'show-from-right', key: index },
			_react2['default'].createElement(
				_touchstonejs.UI.Item,
				{ showDisclosureArrow: true },
				_react2['default'].createElement(
					_touchstonejs.UI.ItemInner,
					null,
					celebrity.name
				)
			)
		);
	},

	render: function render() {
		var celebrity = this.props.celebrity;
		var diet = celebrity.diet;
		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ scrollable: true, className: 'celebrity' },
			_react2['default'].createElement(
				'div',
				{ className: 'celebrity-header', style: { backgroundImage: 'url(img/data/' + celebrity.coverPhoto + ')' } },
				_react2['default'].createElement(
					'div',
					{ className: 'fade' },
					_react2['default'].createElement(
						'div',
						{ className: 'diet-name' },
						diet.name
					)
				)
			),
			_react2['default'].createElement(
				_touchstonejs.UI.Group,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupHeader,
					null,
					celebrity.name
				),
				_react2['default'].createElement(
					_touchstonejs.UI.GroupBody,
					null,
					_react2['default'].createElement(
						_touchstonejs.UI.GroupInner,
						null,
						celebrity.description
					)
				),
				_react2['default'].createElement(
					_touchstonejs.UI.GroupHeader,
					null,
					'Diet description'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.GroupBody,
					null,
					_react2['default'].createElement(
						_touchstonejs.UI.GroupInner,
						null,
						diet.description
					)
				),
				_react2['default'].createElement(
					_touchstonejs.UI.GroupHeader,
					null,
					'Nutritional summary'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.GroupBody,
					null,
					_react2['default'].createElement(
						_touchstonejs.UI.GroupInner,
						null,
						_react2['default'].createElement(PieChart, {
							data: diet.nutritionalSummary,
							width: 290,
							height: 290,
							radius: 50,
							innerRadius: 10,
							sectorBorderColor: 'white'
						})
					)
				)
			),
			_react2['default'].createElement(
				_touchstonejs.UI.Group,
				null,
				_react2['default'].createElement(
					_touchstonejs.Link,
					{ to: 'tabs:recipes', transition: 'show-from-right', viewProps: { celebrity: celebrity } },
					_react2['default'].createElement(
						_touchstonejs.UI.Button,
						{ type: 'primary' },
						'Subscribe to diet'
					)
				)
			)
		);
	}
});

},{"../../data/data":116,"react":undefined,"react-container":undefined,"react-d3":43,"touchstonejs":74}],121:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _touchstonejs = require('touchstonejs');

var data = require("../../data/data");
var PieChart = require('react-d3').PieChart;

module.exports = _react2['default'].createClass({
	displayName: 'exports',

	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation(props, app) {
			return {
				title: "Recipe",
				leftLabel: 'Recipes',
				leftArrow: true,
				leftAction: function leftAction() {
					app.transitionTo('tabs:recipes', { transition: 'reveal-from-right', viewProps: { celebrity: props.celebrity } });
				}
			};
		}
	},

	renderRecipe: function renderRecipe(meal, recipe) {
		return _react2['default'].createElement(
			_touchstonejs.Link,
			{ to: 'tabs:recipe', transition: 'show-from-right', viewProps: { recipe: recipe } },
			_react2['default'].createElement(
				_touchstonejs.UI.Item,
				{ showDisclosureArrow: true },
				_react2['default'].createElement(
					'div',
					{ className: 'recipe-item', style: { backgroundImage: 'url(img/data/' + recipe.coverPhoto + ')' } },
					_react2['default'].createElement(
						'div',
						{ className: 'recipe-name' },
						_react2['default'].createElement(
							'p',
							null,
							meal,
							': ',
							recipe.name
						)
					),
					_react2['default'].createElement(
						'div',
						{ className: 'recipe-dislike' },
						_react2['default'].createElement('span', { className: 'ionicons ion-close-round' }),
						' Dislike'
					)
				)
			)
		);
	},

	render: function render() {
		var recipe = this.props.recipe;

		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ scrollable: true, className: 'recipe' },
			_react2['default'].createElement(
				'div',
				{ className: 'recipe-header', style: { backgroundImage: 'url(img/data/' + recipe.coverPhoto + ')' } },
				_react2['default'].createElement(
					'div',
					{ className: 'recipe-name' },
					_react2['default'].createElement(
						'p',
						null,
						recipe.name
					)
				)
			),
			_react2['default'].createElement(
				_touchstonejs.UI.GroupHeader,
				null,
				'Description'
			),
			_react2['default'].createElement(
				_touchstonejs.UI.GroupBody,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupInner,
					null,
					recipe.description
				)
			),
			_react2['default'].createElement(
				_touchstonejs.UI.GroupHeader,
				null,
				'Ingredients'
			),
			_react2['default'].createElement(
				_touchstonejs.UI.GroupBody,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupInner,
					null,
					_react2['default'].createElement(
						'ul',
						null,
						recipe.ingredients.map(function (ingredient, index) {
							return _react2['default'].createElement(
								'li',
								{ key: index },
								ingredient
							);
						})
					)
				)
			),
			_react2['default'].createElement(
				_touchstonejs.UI.GroupHeader,
				null,
				'Details'
			),
			_react2['default'].createElement(
				_touchstonejs.UI.GroupBody,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupInner,
					null,
					_react2['default'].createElement(
						'ul',
						null,
						_react2['default'].createElement(
							'li',
							null,
							'Kcals: ',
							recipe.kcal
						),
						_react2['default'].createElement(
							'li',
							null,
							'Fats: ',
							recipe.fat
						),
						_react2['default'].createElement(
							'li',
							null,
							'Proteins: ',
							recipe.proteins
						),
						_react2['default'].createElement(
							'li',
							null,
							'Carbs: ',
							recipe.carbs
						),
						_react2['default'].createElement(
							'li',
							null,
							'Cooking time: ',
							recipe.time
						)
					)
				)
			),
			_react2['default'].createElement(
				_touchstonejs.UI.GroupHeader,
				null,
				'Recipe'
			),
			_react2['default'].createElement(
				_touchstonejs.UI.GroupBody,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupInner,
					null,
					recipe.recipe
				)
			)
		);
	}
});

},{"../../data/data":116,"react":undefined,"react-container":undefined,"react-d3":43,"touchstonejs":74}],122:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _touchstonejs = require('touchstonejs');

var data = require("../../data/data");
var PieChart = require('react-d3').PieChart;

module.exports = _react2['default'].createClass({
  displayName: 'exports',

  mixins: [_touchstonejs.Mixins.Transitions],

  statics: {
    navigationBar: 'main',
    getNavigation: function getNavigation(props, app) {
      return {
        title: "Recipes",
        leftLabel: 'Celebrity',
        leftArrow: true,
        leftAction: function leftAction() {
          app.transitionTo('tabs:celebrity', {
            transition: 'reveal-from-right',
            viewProps: { celebrity: props.celebrity }
          });
        }
      };
    }
  },

  getInitialState: function getInitialState() {
    return {
      currentMealIndex: {
        breakfast: 0,
        appetizer: 0,
        lunch: 0,
        snack: 0,
        dinner: 0
      }
    };
  },

  onTapDislike: function onTapDislike(e, meal) {
    e.stopPropagation();

    var celebrity = this.props.celebrity;
    var diet = celebrity.diet;
    var recipes = diet.meals;

    var total = recipes[meal].length;
    var newIndex = (this.state.currentMealIndex[meal] + 1) % total;

    this.state.currentMealIndex[meal] = newIndex;
    this.setState(this.state.currentMealIndex);
  },

  onTapRecipe: function onTapRecipe(recipe) {
    var celebrity = this.props.celebrity;
    this.transitionTo('tabs:recipe', { transition: 'reveal-from-left', viewProps: { celebrity: celebrity, recipe: recipe } });
  },

  renderRecipe: function renderRecipe(meal, recipe) {
    var _this = this;

    return _react2['default'].createElement(
      _touchstonejs.UI.Item,
      { showDisclosureArrow: true, onClick: function () {
          return _this.onTapRecipe(recipe);
        } },
      _react2['default'].createElement(
        'div',
        { className: 'recipe-item', style: { backgroundImage: 'url(img/data/' + recipe.coverPhoto + ')' } },
        _react2['default'].createElement(
          'div',
          { className: 'recipe-name' },
          _react2['default'].createElement(
            'p',
            null,
            meal,
            ': ',
            recipe.name
          )
        ),
        _react2['default'].createElement(
          'div',
          { className: 'recipe-dislike', onClick: function (e) {
              return _this.onTapDislike(e, meal);
            } },
          _react2['default'].createElement('span', { className: 'ionicons ion-close-round' }),
          ' Dislike'
        )
      )
    );
  },

  render: function render() {
    var celebrity = this.props.celebrity;
    var diet = celebrity.diet;
    var recipes = diet.meals;

    return _react2['default'].createElement(
      _reactContainer2['default'],
      { scrollable: true, className: 'recipes' },
      _react2['default'].createElement(
        'div',
        { className: 'celebrity-header', style: { backgroundImage: 'url(img/data/' + celebrity.coverPhoto + ')' } },
        _react2['default'].createElement(
          'div',
          { className: 'fade' },
          _react2['default'].createElement(
            'div',
            { className: 'diet-name-container' },
            _react2['default'].createElement(
              'span',
              { className: 'diet-name' },
              diet.name
            )
          ),
          _react2['default'].createElement(
            'div',
            null,
            _react2['default'].createElement(
              'span',
              { className: 'diet-day' },
              'Day 2'
            )
          )
        )
      ),
      _react2['default'].createElement(
        _touchstonejs.UI.Group,
        null,
        this.renderRecipe("breakfast", recipes.breakfast[this.state.currentMealIndex.breakfast]),
        this.renderRecipe("appetizer", recipes.appetizer[this.state.currentMealIndex.appetizer]),
        this.renderRecipe("lunch", recipes.lunch[this.state.currentMealIndex.lunch]),
        this.renderRecipe("snack", recipes.snack[this.state.currentMealIndex.snack]),
        this.renderRecipe("dinner", recipes.dinner[this.state.currentMealIndex.dinner])
      ),
      _react2['default'].createElement(
        _touchstonejs.UI.Group,
        null,
        _react2['default'].createElement(
          _touchstonejs.Link,
          { to: 'tabs:shopping-list', transition: 'show-from-right', viewProps: { celebrity: celebrity } },
          _react2['default'].createElement(
            _touchstonejs.UI.Button,
            { type: 'primary' },
            'Shopping List'
          )
        )
      )
    );
  }
});

},{"../../data/data":116,"react":undefined,"react-container":undefined,"react-d3":43,"touchstonejs":74}],123:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _touchstonejs = require('touchstonejs');

var data = require("../../data/data");
var PieChart = require('react-d3').PieChart;

module.exports = _react2['default'].createClass({
  displayName: 'exports',

  mixins: [_touchstonejs.Mixins.Transitions],

  statics: {
    navigationBar: 'main',
    getNavigation: function getNavigation(props, app) {
      return {
        title: "Recipes",
        leftLabel: 'Celebrity',
        leftArrow: true,
        leftAction: function leftAction() {
          app.transitionTo('tabs:celebrity', {
            transition: 'reveal-from-right',
            viewProps: { celebrity: props.celebrity }
          });
        }
      };
    }
  },

  getInitialState: function getInitialState() {
    return {
      currentMealIndex: {
        breakfast: 0,
        appetizer: 0,
        lunch: 0,
        snack: 0,
        dinner: 0
      }
    };
  },

  onTapDislike: function onTapDislike(e, meal) {
    e.stopPropagation();

    var celebrity = this.props.celebrity;
    var diet = celebrity.diet;
    var recipes = diet.meals;

    var total = recipes[meal].length;
    var newIndex = (this.state.currentMealIndex[meal] + 1) % total;
    console.log("new index", newIndex);

    this.state.currentMealIndex[meal] = newIndex;
    this.setState(this.state.currentMealIndex);
  },

  onTapRecipe: function onTapRecipe(recipe) {
    var celebrity = this.props.celebrity;
    this.transitionTo('tabs:recipe', { transition: 'reveal-from-left', viewProps: { celebrity: celebrity, recipe: recipe } });
  },

  renderRecipe: function renderRecipe(meal, recipe) {
    var _this = this;

    return _react2['default'].createElement(
      _touchstonejs.UI.Item,
      { showDisclosureArrow: true, onClick: function () {
          return _this.onTapRecipe(recipe);
        } },
      _react2['default'].createElement(
        'div',
        { className: 'recipe-item', style: { backgroundImage: 'url(img/data/' + recipe.coverPhoto + ')' } },
        _react2['default'].createElement(
          'div',
          { className: 'recipe-name' },
          _react2['default'].createElement(
            'p',
            null,
            meal,
            ': ',
            recipe.name
          )
        ),
        _react2['default'].createElement(
          'div',
          { className: 'recipe-dislike', onClick: function (e) {
              return _this.onTapDislike(e, meal);
            } },
          _react2['default'].createElement('span', { className: 'ionicons ion-close-round' }),
          ' Dislike'
        )
      )
    );
  },

  render: function render() {
    var celebrity = this.props.celebrity;
    var diet = celebrity.diet;
    var recipes = diet.meals;

    return _react2['default'].createElement(
      _reactContainer2['default'],
      { scrollable: true, className: 'recipes' },
      _react2['default'].createElement(
        'div',
        { className: 'celebrity-header', style: { backgroundImage: 'url(img/data/' + celebrity.coverPhoto + ')' } },
        _react2['default'].createElement(
          'div',
          { className: 'fade' },
          _react2['default'].createElement(
            'div',
            { className: 'diet-name-container' },
            _react2['default'].createElement(
              'span',
              { className: 'diet-name' },
              diet.name
            )
          ),
          _react2['default'].createElement(
            'div',
            null,
            _react2['default'].createElement(
              'span',
              { className: 'diet-day' },
              'Day 1'
            )
          )
        )
      ),
      _react2['default'].createElement(
        _touchstonejs.UI.Group,
        null,
        this.renderRecipe("breakfast", recipes.breakfast[this.state.currentMealIndex.breakfast]),
        this.renderRecipe("appetizer", recipes.appetizer[this.state.currentMealIndex.appetizer]),
        this.renderRecipe("lunch", recipes.lunch[this.state.currentMealIndex.lunch]),
        this.renderRecipe("snack", recipes.snack[this.state.currentMealIndex.snack]),
        this.renderRecipe("dinner", recipes.dinner[this.state.currentMealIndex.dinner])
      ),
      _react2['default'].createElement(
        _touchstonejs.UI.Group,
        null,
        _react2['default'].createElement(
          _touchstonejs.Link,
          { to: 'tabs:recipes-2', transition: 'show-from-right', viewProps: { celebrity: celebrity } },
          _react2['default'].createElement(
            _touchstonejs.UI.Button,
            { type: 'primary' },
            'Next day'
          )
        )
      )
    );
  }
});

},{"../../data/data":116,"react":undefined,"react-container":undefined,"react-d3":43,"touchstonejs":74}],124:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _touchstonejs = require('touchstonejs');

var data = require("../../data/data");
var PieChart = require('react-d3').PieChart;

module.exports = _react2['default'].createClass({
  displayName: 'exports',

  statics: {
    navigationBar: 'main',
    getNavigation: function getNavigation(props, app) {
      return {
        title: "Shopping list",
        leftLabel: 'Recipes',
        leftArrow: true,
        leftAction: function leftAction() {
          app.transitionTo('tabs:recipes', { transition: 'reveal-from-right', viewProps: { celebrity: props.celebrity } });
        }
      };
    }
  },

  render: function render() {
    var celebrity = this.props.celebrity;
    var shoppingList = this.props.celebrity.diet.shoppingList;

    return _react2['default'].createElement(
      _reactContainer2['default'],
      { scrollable: true, className: 'shopping-list' },
      _react2['default'].createElement(
        'div',
        { className: 'celebrity-header', style: { backgroundImage: 'url(img/data/' + celebrity.coverPhoto + ')' } },
        _react2['default'].createElement(
          'div',
          { className: 'fade' },
          _react2['default'].createElement(
            'div',
            { className: 'diet-name' },
            'Shopping list'
          )
        )
      ),
      _react2['default'].createElement(
        _touchstonejs.UI.Group,
        null,
        _react2['default'].createElement(
          _touchstonejs.UI.GroupBody,
          null,
          _react2['default'].createElement(
            _touchstonejs.UI.GroupInner,
            null,
            _react2['default'].createElement(
              'ul',
              null,
              shoppingList.map(function (item, index) {
                return _react2['default'].createElement(
                  'li',
                  { key: index },
                  item
                );
              })
            )
          )
        )
      ),
      _react2['default'].createElement(
        _touchstonejs.UI.Group,
        null,
        _react2['default'].createElement(
          _touchstonejs.UI.Button,
          { type: 'primary' },
          'Buy'
        )
      )
    );
  }
});

},{"../../data/data":116,"react":undefined,"react-container":undefined,"react-d3":43,"touchstonejs":74}],125:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _touchstonejs = require('touchstonejs');

var data = require("../../data/data");
var PieChart = require('react-d3').PieChart;

module.exports = _react2['default'].createClass({
  displayName: 'exports',

  statics: {
    navigationBar: 'main',
    getNavigation: function getNavigation(props, app) {
      return {
        title: "Subscribe",
        leftLabel: 'Celebrities',
        leftArrow: true,
        leftAction: function leftAction() {
          app.transitionTo('tabs:celebrities', { transition: 'reveal-from-right' });
        }
      };
    }
  },

  render: function render() {
    return _react2['default'].createElement(
      _reactContainer2['default'],
      { scrollable: true, className: 'subscribe' },
      _react2['default'].createElement(
        'h1',
        null,
        'Premium'
      ),
      _react2['default'].createElement(
        'h2',
        null,
        '0,79€/mo'
      ),
      _react2['default'].createElement(
        _touchstonejs.UI.GroupInner,
        null,
        _react2['default'].createElement(
          'p',
          null,
          'What kind of demonic pact did these celebrities to get this sexy body ?'
        ),
        _react2['default'].createElement(
          'p',
          null,
          'Get the changes made in theirs eating habits and Smile with ours innocent gags !',
          _react2['default'].createElement('br', null),
          'Get exclusive weekly updates and performs especially effective diets .'
        ),
        _react2['default'].createElement(
          'p',
          null,
          'Stop wasting the time and unlock all available content just for 0.79 € per month , and be aware of some details that you can get :) .'
        )
      ),
      _react2['default'].createElement(
        _touchstonejs.UI.Button,
        { type: 'primary' },
        'Buy'
      )
    );
  }
});

},{"../../data/data":116,"react":undefined,"react-container":undefined,"react-d3":43,"touchstonejs":74}]},{},[117]);
