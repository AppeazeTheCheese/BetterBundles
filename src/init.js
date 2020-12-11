exports.mod = (mod_info) => {
    logger.logInfo("[MOD] BetterBundles");
    
    bundles_f = require("./Classes/bundles");
    bundles_f.handler.initialize(null);
	
	logger.logSuccess("[MOD] BetterBundles; Applied");
}