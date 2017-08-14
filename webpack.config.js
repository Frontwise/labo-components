const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const BUILD_DIR = path.resolve(__dirname, 'dist');
const APP_DIR = path.resolve(__dirname, 'app');

var config = {
    entry: [APP_DIR + '/index.jsx'],
    devtool: 'source-map',
    output: {
        path: BUILD_DIR,
        filename: 'labo-components.js',
        libraryTarget: 'umd',
        library: 'labo',
        umdNamedDefine: true
    },
    resolve: {
        extensions: ['.js', '.jsx']
    },
    module: {
        rules: [
            {
                test: /.jsx?$/,
                exclude: /node_modules/,
                include: APP_DIR,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            babelrc: false,
                            presets: [
                                "react",
                                [
                                    "env",
                                    {
                                        "modules": false,
                                        loose: true,
                                        "targets": {
                                            "browsers": ["last 2 versions", "ie >= 11"]
                                        },
                                        forceAllTransforms: true
                                    }
                                ]
                            ]
                        }
                    }
                ]
            },
            {
                test: /\.woff($|\?)|\.woff2($|\?)|\.ttf($|\?)|\.eot($|\?)|\.svg($|\?)/,
                loader: 'url-loader'
            },
            {
                test: /\.scss$/,
                use: ExtractTextPlugin.extract(
                    {
                        fallback: 'style-loader',
                        use: ['css-loader', 'sass-loader']
                    }
                )
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        }),
        new ExtractTextPlugin({
            filename: 'labo-component.css',
            allChunks: true
        }),
        // new BundleAnalyzerPlugin()
    ],
    externals: {
        "jquery": "jQuery",
        react: {
            root: 'React',
            commonjs2: 'react',
            commonjs: 'react',
            amd: 'react',
            umd: 'react',
        },
        'react-dom': {
            root: 'ReactDOM',
            commonjs2: 'react-dom',
            commonjs: 'react-dom',
            amd: 'react-dom',
            umd: 'react-dom',
        }
    },
};
//Production only processes.
if (process.env.NODE_ENV == 'production') {
    console.log('Running Production build !!!');
    config.plugins.push(
        new webpack.optimize.UglifyJsPlugin({
            // beautify: true, // set to true disable compression. Good when debugging/dev.
            mangle: false,
            compress: {
                screw_ie8: true,
                comparisons: false,
                dead_code: true,
                warnings: false
            },
            output: {screw_ie8: true},
            comments: false,
            unused: true,
            loops: true,
            conditionals: true
        })
    )
}

module.exports = config;