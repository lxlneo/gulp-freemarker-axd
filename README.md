
# gulp-freemarker-neo


> freemarker plugin for [gulp](https://github.com/wearefractal/gulp)

## Usage

First, install `gulp-freemarker-axd` as a development dependency:

```shell
npm install --save-dev gulp-freemarker-neo
```

Then, add it to your `gulpfile.js`:

```javascript
var freemarker = require("gulp-freemarker-neo");

gulp.src("./mock/*.json")
	.pipe(freemarker({
		viewRoot: "WEB-INF/views/",
		options: {},
		globalData:"",
        directiveUrl:""
	}))
	.pipe(gulp.dest("./www"));
```

You should provide mock files, which type is json:

```json
{
	"file": "hello.ftl",
	"data": {
		"name": "World"
	}
}
```


* `file` is relative to `viewRoot`, gulp-freemarker-neo will read and process `${viewRoot}/${file}` file.

* `data` is the data model the template required.


## API

### freemarker(options)

#### options.viewRoot
Type: `String`
Required: true

The directory where all templates files in.

#### options.options
Type: `Object`
Default: {}

Options for [Freemarker.js](http://github.com/ijse/freemarker.js). see also [https://github.com/ijse/freemarker.js#configurations](https://github.com/ijse/freemarker.js#configurations).


## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)
 
