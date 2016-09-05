var path = require('path');
var fs = require('fs');
var uuid = require('node-uuid');
var os = require('os');

var fmpp = require('./fmpp.js');
var _ = require('lodash');

function nop() {
}
function getTmpFileName() {
  return path.join(os.tmpDir(), 'axd_temp', uuid.v4()).replace(/\\/g, '/');
}

function writeTmpFile(data, done) {
  var fileName = getTmpFileName();
  fs.writeFile(fileName, data, function (err) {
    done(err, fileName);
  });
}
function writeTmpFileSync(data) {
  var fileName = getTmpFileName();
  fs.writeFileSync(fileName, data);
  return fileName;
}

/**
 * Freemarker Class
 *
 * @param {Object} settings
 * settings.globalData:新增加全局数据路径
 */
function Freemarker(settings) {
  console.log("init----------")
  var fmpOpts = settings.options || {};

  if (!settings.viewRoot) {
    throw new Error('Freemarker: Need viewRoot param.')
  }
  if (!fmpOpts.sourceRoot) {
    fmpOpts.sourceRoot = settings.viewRoot;
  }
  if (!fmpOpts.outputRoot) {
    fmpOpts.outputRoot = os.tmpDir();
  }

  // Convert folder seperate in case of Windows
  fmpOpts.sourceRoot = fmpOpts.sourceRoot.replace(/\\/g, '/');
  fmpOpts.outputRoot = fmpOpts.outputRoot.replace(/\\/g, '/');

  this.viewRoot = settings.viewRoot;
  var globalData = {};
  //新增加全局数据路径
  if (settings.globalData) {
    try {
      globalData = JSON.parse(fs.readFileSync(settings.globalData, 'utf-8'));
    } catch (err) {
      throw  err
    }
    this.globalData = globalData;
  }
  if (settings.directiveUrl) {
    this.directiveUrl = settings.directiveUrl;
  }
  this.options = fmpOpts;
}

/**
 * Convert Object to fmpp configuration content
 *   with TDD syntax, see also http://fmpp.sourceforge.net/tdd.html
 *
 * @param  {Object}   data resource data
 * @return {String} result
 */
function generateConfiguration(data, done) {
  var sName = Object.keys(data || {});
  var result = [];
  sName.forEach(function (x) {
    var value = data[x];
    if (typeof value !== 'boolean') {
      result.push(x + ': ' + value);
    } else if (value === true) {
      // For boolean settings, empty-string is considered as true
      result.push(x);
    }
  });

  return result.join('\n');
}
//创建文件夹
function mkdir(dir) {
  if (fs.existsSync(dir)) {
    return;
  }
  var dirname = path.dirname(dir);
  if (!fs.existsSync(dirname)) {
    arguments.callee(dirname);
  }
  fs.mkdirSync(dir);
}
function touchFile(path) {
  fs.appendFile(path, "");
}
/**
 * 添加 DirectiveFtl 文件
 */
function concatDirectiveFtl(tpl, directivePath) {
  var content = fs.readFileSync(tpl, 'utf-8');
  var directive = fs.readFileSync(directivePath, 'utf-8');
  content = directive + content;
  var dest = tpl.replace('.ftl', '.temp');
  if(fs.existsSync){
    fs.unlinkSync(dest);
  }
  fs.appendFileSync(dest, content);
  return dest;
}

Freemarker.prototype.render = function (tpl, data, done) {
  //拼装数据
  if (this.globalData) {
    data = _.assign(data, this.globalData)
  }
  var dataTdd = convertDataModel(data);

  //拼装directiveUrl到每个页面
  var tplFile = path.join(this.viewRoot, tpl).replace(/\\/g, '/');
  if (this.directiveUrl) {
    tplFile = concatDirectiveFtl(tplFile, this.directiveUrl);
  }
  // Make configuration file for fmpp
  var cfgDataObject = this.options;
  cfgDataObject.data = dataTdd;

  // Set output file
  var tmpFile = getTmpFileName();
  if (!fs.existsSync(tmpFile)) {
    mkdir(tmpFile);
  }
  tmpFile = tmpFile + "/" + uuid.v4();
  fs.appendFile(tmpFile, "");
  cfgDataObject.outputFile = tmpFile;
  var cfgContent = generateConfiguration(cfgDataObject);
  writeTmpFile(cfgContent, function getCfgFileName(err, cfgFile) {
    if (err) {
      return done(err);
    }
    var args = [tplFile, '-C', cfgFile];
    fmpp.run(args, function getFMPPResult(err, respData) {
      if (err) {
        fs.unlink(tplFile, nop);
        return done(err, null, respData);
      }
      fs.readFile(tmpFile, function (err, result) {
        done(err, '' + result, respData);
        fs.unlink(tmpFile, nop);
        fs.unlink(cfgFile, nop);
        fs.unlink(tplFile, nop);
      });
    });
  });
  return;
};

Freemarker.prototype.renderSync = function (tpl, data) {
  var dataTdd = convertDataModel(data);
  var tplFile = path.join(this.viewRoot, tpl).replace(/\\/g, '/');

  // Make configuration file for fmpp
  var cfgDataObject = this.options;
  cfgDataObject.data = dataTdd;

  // Set output file
  var tmpFile = getTmpFileName();
  cfgDataObject.outputFile = tmpFile;

  var cfgContent = generateConfiguration(cfgDataObject);

  var output = null;
  var result = '';
  try {
    var cfgFile = writeTmpFileSync(cfgContent);
    var args = [tplFile, '-C', cfgFile];
    output = fmpp.runSync(args);

    // Wait for tmpFile created
    while (!fs.existsSync(tmpFile)) {
    }
    result = fs.readFileSync(tmpFile);
  } catch (e) {
    output = e;
  }

  return '' + result || output;
};

/**
 * Render views in bulk mode
 * @param  {String}   cfgFile configuration file
 * @param  {Function} done    callback
 */
Freemarker.prototype.renderBulk = function (cfgFile, done) {
  fmpp.run(['-C', cfgFile], done);
};

Freemarker.exec = fmpp.run;

/**
 * Convert data object to TDD
 * @param  {Ojbect} data
 * @return {String}      [description]
 */
function convertDataModel(data) {
  return JSON.stringify(data, true, ' ');
}

/*
 Freemarker.version = require('./package.json').version;
 Freemarker.getFMPPVersion = function getFMPPVersion(cb) {
 fmpp.run(['--version'], cb);
 };*/

module.exports = Freemarker;
