"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "instrumentation";
exports.ids = ["instrumentation"];
exports.modules = {

/***/ "(instrument)/./src/instrumentation.ts":
/*!********************************!*\
  !*** ./src/instrumentation.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\nasync function register() {\n// Background workers (Veri*Factu queue, DB backup) use Node-only APIs (child_process, pg_dump).\n// They are started via API-side queue subscribers / dev:ws — not via instrumentation,\n// to avoid pulling server modules into the Next.js client bundle.\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGluc3RydW1lbnQpLy4vc3JjL2luc3RydW1lbnRhdGlvbi50cyIsIm1hcHBpbmdzIjoiOzs7O0FBQU8sZUFBZUE7QUFDcEIsZ0dBQWdHO0FBQ2hHLHNGQUFzRjtBQUN0RixrRUFBa0U7QUFDcEUiLCJzb3VyY2VzIjpbIi9Vc2Vycy92eXR2eXRza3lpL2NvcmdpX2NhZmUvYXBwcy93ZWIvc3JjL2luc3RydW1lbnRhdGlvbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVnaXN0ZXIoKSB7XG4gIC8vIEJhY2tncm91bmQgd29ya2VycyAoVmVyaSpGYWN0dSBxdWV1ZSwgREIgYmFja3VwKSB1c2UgTm9kZS1vbmx5IEFQSXMgKGNoaWxkX3Byb2Nlc3MsIHBnX2R1bXApLlxuICAvLyBUaGV5IGFyZSBzdGFydGVkIHZpYSBBUEktc2lkZSBxdWV1ZSBzdWJzY3JpYmVycyAvIGRldjp3cyDigJQgbm90IHZpYSBpbnN0cnVtZW50YXRpb24sXG4gIC8vIHRvIGF2b2lkIHB1bGxpbmcgc2VydmVyIG1vZHVsZXMgaW50byB0aGUgTmV4dC5qcyBjbGllbnQgYnVuZGxlLlxufVxuIl0sIm5hbWVzIjpbInJlZ2lzdGVyIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(instrument)/./src/instrumentation.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(instrument)/./src/instrumentation.ts"));
module.exports = __webpack_exports__;

})();