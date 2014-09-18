var htmlTemplates = htmlTemplates || {};htmlTemplates['views-graphs.html'] = '';

var htmlTemplates = htmlTemplates || {};htmlTemplates['views-tiles.html'] = '<header class=tile-header>\n' +
    '	<a class=tile-author>\n' +
    '		<% if (profile_image_url) { %>\n' +
    '			<img class=tile-author-avatar src="<%=profile_image_url%>" alt="<%=name%>\'s avatar">\n' +
    '		<% } %>\n' +
    '		<strong class=tile-author-name><%=name%></strong>\n' +
    '	</a>\n' +
    '	<div class=tile-pinned>Pinned</div>\n' +
    '	<div class=tile-logo></div>\n' +
    '</header>\n' +
    '<div class=tile-content>\n' +
    '	<% if (media_url) { %>\n' +
    '		<img class=tile-media src="<%=media_url%>" alt="<%=text%>">\n' +
    '	<% } else { %>\n' +
    '		<%=text%>\n' +
    '	<% } %>\n' +
    '</div>\n' +
    '<footer class=tile-footer>\n' +
    '	<a target=_blank href="<%=link%>">view post</a>\n' +
    '</footer>\n' +
    '';

(function(){
  var cache = {};

  this.tmpl = function tmpl(str, data){
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var fn = !/\W/.test(str) ?
      cache[str] = cache[str] ||
        tmpl(document.getElementById(str).innerHTML) :

      // Generate a reusable function that will serve as a template
      // generator (and which will be cached).
      new Function("obj",
        "var p=[],print=function(){p.push.apply(p,arguments);};" +

        // Introduce the data as local variables using with(){}
        "with(obj){p.push('" +

        // Convert the template into pure JavaScript
        str
          .replace(/[\r\t\n]/g, " ")
          .split("<%").join("\t")
          .replace(/((^|%>)[^\t]*)'/g, "$1\r")
          .replace(/\t=(.*?)%>/g, "',$1,'")
          .split("\t").join("');")
          .split("%>").join("p.push('")
          .split("\r").join("\\'")
      + "');}return p.join('');");

    // Provide some basic currying to the user
    return data ? fn( data ) : fn;
  };
})();


!function () {

	function observe(obj, prop, cb) {
		function observeProp() {
			Object.observe(obj[prop], function (changes) {
				changes.forEach(function (change) {
					cb(change.object)
				})
			})
		}

		observeProp()

		Object.observe(obj, function (changes) {
			changes.forEach(function(change) {
				console.log(change)
				if (change.name === prop) {
					observeProp()
					cb(change.object[prop])
				}
			})
		})
	}

	function tiles(selector) {
		var template = tmpl(htmlTemplates['views-tiles.html'])
		var el = d3.select(selector).selectAll('div')
		var source = null

		function visual(posts) {
			//console.log('got posts', posts)
			el = el.data(posts)
			el.enter().append('div')
				.style('opacity', 0)
			el
				.attr('class', function (p) {
					return 'tile tile-' + p.type + (p.media_url ? ' tile-has-media' : '')
				})
				.html(function (p) { return template(normalizePost(p)) })
				.transition()
				.duration(1000)
				.style('opacity', 1)
			el.exit().remove()
			return this
		}

		visual.source = function (value) {
			if (!arguments.length) return source
			source = value
			observe(source, 'posts', visual)
			return visual
		}

		return visual
	}

	// Returns an HTTP source
	function json(host) {
		this.posts = []
		d3.json(host + '/posts', function (error, json) {
			this.posts = json.posts
		}.bind(this))
		console.log(this)
		return this
	}

	function socketio(host) {
		this.posts = []
		var posts = []
		var ws = io.connect(host, {'force new connection': true})
		var sock = ws.socket
		sock.on('connect', function () {
			ws.emit('ready', 'default')
			console.log('ready')
		})
		sock.on('connect_failed', function () {
			console.error('connection failed')
		})
		sock.on('error', function () {
			console.error('connection error')
		})
		ws.on('recvData', function (data) {
			var post = JSON.parse(data)
			if (posts.length < 20 || post.flag == 'new')
				posts.push(post)
		}.bind(this))
		// periodically update the posts
		setInterval(function () {
			if (this.posts != posts)
				this.posts = posts
		}.bind(this), 500)
		return this
	}

	function normalizePost(post) {
		post.profile_image_url = post.profile_image_url || null;
		post.media_url = post.media_url || null;
		return post
	}

	this.nio = {
		json: json,
		tiles: tiles,
		socketio: socketio,
	}

}()
