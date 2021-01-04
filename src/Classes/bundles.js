"use strict";

const path = require('path');
const rootFolder = path.resolve(path.join(__dirname, "../../../../../"));
const modsFolder = path.resolve(path.join(rootFolder, "user/mods"));
const resBundlesFolder = path.resolve(path.join(rootFolder, "res/bundles"));

class BundlesServer {
    constructor() {
        this.bundles = [];
        this.bundleBykey = {};
        this.backendUrl = `https://${serverConfig.ip}:${serverConfig.port}`;
    }

    initialize(sessionID) {
        this.populateBundles();
    }

    populateBundles(){

        // Check if there is a "folders" or "files" property with items in the mod config
        this.bundles = [];
        this.bundleBykey = {};

        res.bundles = {files: {}, folders: {}};

        var files = [];
        var folders = [];

        var modFolders = fileIO.readDir(modsFolder);
        for(var i in modFolders){
            var fullPath = path.resolve(path.join(modsFolder, modFolders[i]));
            if(!fileIO.lstatSync(fullPath).isDirectory()) continue;

            var splitPath = fullPath.split(path.sep);
            var folderName = splitPath[splitPath.length - 1];
            var [author, modName, version] = folderName.split("-");

            var modConfig = modsConfig.filter(x => x.author === author && x.name === modName && x.version === version)[0];

            // Check if mod is enabled without excluding undefined values
            if(modConfig !== undefined && modConfig.enabled === false) continue;
            var configPath = path.resolve(path.join(fullPath, "mod.config.json"));
            if(!internal.fs.existsSync(configPath)) continue;

            var config = fileIO.readParsed(configPath);
            if(config.res !== undefined && config.res.bundles !== undefined){
                if(config.res.bundles.files !== undefined){
                    for(var p in config.res.bundles.files){
                        files.push(path.join("user/mods", folderName, config.res.bundles.files[p]));
                    }
                }
                if(config.res.bundles.folders !== undefined){
                    for(var p in config.res.bundles.folders){
                        folders.push(path.join("user/mods", folderName, config.res.bundles.folders[p]));
                    }
                }
            }
        }
        if(internal.fs.existsSync(resBundlesFolder))
            folders.push('res\\bundles');
        res.bundles.files = Object.assign({}, files);
        res.bundles.folders = Object.assign({}, folders);
        if(res.bundles.folders !== undefined && Object.keys(res.bundles.folders).length > 0){
            for(var f of Object.keys(res.bundles.folders)){
                var fullPath = path.join(rootFolder, res.bundles.folders[f]);
                var files = this.getFilesRecurse(fullPath).filter(x => x.endsWith(".bundle"));
                for(var file in files){
                    this.loadBundle(files[file]);
                }
            }
        }
        if(res.bundles.files !== undefined && Object.keys(res.bundles.files).length > 0){
            for(var f of Object.keys(res.bundles.files)){
                var fullPath = path.join(rootFolder, res.bundles.files[f]);
                if(!internal.fs.existsSync(fullPath)) continue;
                if(fullPath.endsWith(".bundle"))
                    this.loadBundle(fullPath);
            }
        }
    }

    loadBundle(itemPath){
        var fullItemPath = path.resolve(itemPath);
        var uniformPath = fullItemPath.replace(/\\/g, "/");
        var key = undefined;

        if(uniformPath.toLowerCase().includes("/user/mods/"))
            key = uniformPath.split(/\/user\/mods\//i)[1];
        else if(uniformPath.toLowerCase().includes("/res/bundles/"))
            key = uniformPath.split(/\/res\/bundles\//i)[1];
        
        if(this.bundleBykey !== undefined && this.bundleBykey[key] !== undefined) return;
        var manifestFile = itemPath + ".manifest";
        var dependencyKeys = [];
        if(internal.fs.existsSync(manifestFile)){
            var content = internal.fs.readFileSync(manifestFile).toString();
            var dependencyKeys = content.toString().replace(/\r/g, "").split("\n").filter(x => x !== null && x.match(/^ *$/) === null);
        }
        var bundle = {
            "key": key,
            "path": `${this.backendUrl}/files/bundle/${key}`,
            "filePath": uniformPath,
            "dependencyKeys": dependencyKeys
        }
        this.bundles.push(bundle);
        this.bundleBykey[bundle.key] = bundle;
    }

    getFilesRecurse(folderPath){
        var paths = [];
        if(!internal.fs.existsSync(folderPath)) return paths;

        var items = fileIO.readDir(folderPath);

        for(var i in items){
            var fullItemPath = path.join(folderPath, items[i]);
            if(fileIO.lstatSync(fullItemPath).isDirectory()){
                paths = paths.concat(this.getFilesRecurse(fullItemPath));
            }
            else
                paths.push(fullItemPath);
        }
        return paths;
    }

    getBundles(local) {
        let bundles = helper_f.clone(this.bundles);
        for (const bundle of bundles) {
            if(local) {
                bundle.path = bundle.filePath;
            }
            delete bundle.filePath;
        }
        return bundles;
    }

    getBundleByKey(key, local) {
        let bundle = helper_f.clone(this.bundleBykey[key]);
        if(local) {
            bundle.path = bundle.filePath;
        }
        delete bundle.filePath;
        return bundle;
    }
    

    getFilePath(bundleDir, key) {
        return `${internal.path.join(__dirname).split("src")[0]}user/mods/${bundleDir}StreamingAssets/Windows/${key}`.replace(/\\/g, "/");
    }

    getHttpPath(bundleDir, key) {
        return `${this.backendUrl}/files/bundle/${key}`;
    }
}

module.exports.handler = new BundlesServer();
