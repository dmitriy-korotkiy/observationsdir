const fs = require("fs");
const md5 = require("md5");
const {default: axios} = require("axios");
const FormData = require("form-data");
let cli = async function() {
    const axios = require('axios').default;
    const fs = require('fs');
    const path = require('path');
    const chokidar = require('chokidar');
    const FormData = require('form-data');
    const md5 = require('md5');
    const yargs = require('yargs/yargs')
    const { hideBin } = require('yargs/helpers')
    const getFiles = require('./get-files')

    let newPath = './dist/';
    let myServer = 'http://localhost:8083';
    let myToken = '';
    let designID = '1';

    const argv = yargs(hideBin(process.argv)).argv

    if (argv.paths) {
        newPath = (String(argv.paths))
    }
    if (argv.server) {
        myServer = (String(argv.server))
    }
    if (argv.design) {
        designID = (String(argv.design))
    }
    if (argv.token) {
        myToken = (String(argv.token))
    }

    async function getData(url) {
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error(error);
        }
    }

    let listNameOfServer = await getData(myServer+'/api/v3/'+designID+'/static')
    let listTemplatesOfServer = await getData(myServer+'/api/v3/'+designID+'/template')
    let listLangOfServer = await getData(myServer+'/api/v3/'+designID+'/i18n/data-list')



    const absoluteNewPath = path.resolve(newPath) + '/';

    let listLocalFiles = await getFiles(newPath);
    let listNameLocal = listLocalFiles.map((elem) => {
        if (elem.indexOf(".html") >= 0) {
            const data = fs.readFileSync(elem);
            return {
                name: '',
                html: elem.replace(absoluteNewPath, ''),
                lang: '',
                hashSum: md5(data),
            };
        } else if (elem.indexOf("i18n/") >= 0){
            const data = fs.readFileSync(elem, "utf8");
            return {
                name: '',
                html: '',
                lang: elem.replace(absoluteNewPath, ''),
                hashSum: data,
            };
        } else {
            const data = fs.readFileSync(elem);
            return {
                name: elem.replace(absoluteNewPath, ''),
                html: '',
                lang: '',
                hashSum: md5(data),
            };
        }
    })

    // console.log(listNameLocal)

    const watcher = chokidar.watch(absoluteNewPath, {
        persistent: true
    });
    watcher.on('ready', () => {
        watcher.on('add', (path) => console.log(`File ${path} has been added on local`) | sending(`${path}`))
            .on('unlink', (path) => console.log(`File ${path} has been removed on local`) | delFiles(`${path}`))
            .on('change', (path) => console.log(`File ${path} has been changed on local`) | sending(`${path}`))
            .on('addDir', (path) => console.log(`Directory ${path} has been added on local`))
            .on('unlinkDir', (path) => console.log(`Directory ${path} has been removed on local`));
    });

    function diffName(a1, a2) {
       return a1.filter((a1Item) => {
           if (a1Item.name === '') {
               return false
           } else {
               const a2Item = a2.find(i => i.name === a1Item.name);
               return !a2Item || a1Item.hashSum !== a2Item.hashSum;
           }
       })
    }

    let listNameAppend = diffName(listNameLocal, listNameOfServer)

    function diffHTML(a1, a2) {
        return a1.filter((a1Item) => {
            if (a1Item.html === '') {
                return false
            } else {
                const a2Item = a2.find(i => i.name === a1Item.html);
                return !a2Item || a1Item.hashSum !== a2Item.hashSum;
            }
        })
    }

    let listHTMLAppend = diffHTML(listNameLocal, listTemplatesOfServer)

    function diffLang(a1, a2) {
        return a1.filter((a1Item) => {
            if (a1Item.lang === '') {
                return false
            } else {
                const a2Item = a2.find(i => i.lang === a1Item.lang.replace('i18n/', ''));
                return !a2Item || a1Item.hashSum !== a2Item.data;
            }
        })
    }

    let listLangAppend = diffLang(listNameLocal, listLangOfServer)

    console.log(listLangAppend)

    if (listNameAppend.length > 0) {
        for (const entry of listNameAppend) {
            const data = await fs.promises.readFile(newPath+entry.name);
            const form = new FormData();
            form.append('name', entry.name);
            form.append('isActive', 'true');
            form.append('data', data, entry.name);

            try {
                await axios.post(myServer+'/api/v3/'+designID+'/static/native', form, {
                    headers: {
                        ...form.getHeaders()
                    },
                })
            } catch (error) {
                console.error(error)
                process.exit(1)
            }
            console.log('Files '+entry.name+' added to server');
        }
    }

    if (listHTMLAppend.length > 0) {
        for (const entry of listHTMLAppend) {
            const data = await fs.promises.readFile(newPath+entry.html, "utf8");

            const params = {
                id: 0,
                designId: parseInt(designID),
                name: entry.html,
                template: data,
                isActive: true,
                hashSum: entry.hashSum,
            }

            try {
                await axios.post(myServer+'/api/v3/'+designID+'/template/native', params)
            } catch (error) {
                console.error(error)
                process.exit(1)
            }
            console.log('Files '+entry.html+' added to templates');
        }
    }

    if (listLangAppend.length > 0) {
        for (const entry of listLangAppend) {
            if (entry.hashSum !== '') {
                const params = {
                    id: 0,
                    designId: parseInt(designID),
                    lang: entry.lang.replace('i18n/', ''),
                    data: entry.hashSum,
                    isActive: true,
                }

                try {
                    await axios.post(myServer + '/api/v3/' + designID + '/i18n/native', params)
                } catch (error) {
                    console.error(error)
                    process.exit(1)
                }
                console.log('Files ' + entry.lang + ' added to i18n');
            }
        }
    }

    const sending = async function (file) {
        if (file.indexOf(".html") >= 0) {
            const data = await fs.promises.readFile(file, "utf8");

            const params = {
                id: 0,
                designId: parseInt(designID),
                name: file.replace(absoluteNewPath, ''),
                template: data,
                isActive: true,
                hashSum: md5(data),
            }

            try {
                await axios.post(myServer+'/api/v3/'+designID+'/template/native', params)
            } catch (error) {
                console.error(error)
                process.exit(1)
            }
            console.log('Template '+file+' added');

        } else if (file.indexOf("i18n/") >= 0) {
            const data2 = await fs.promises.readFile(file, "utf8");
            if (data2 !== '') {
                const params = {
                    id: 0,
                    designId: parseInt(designID),
                    lang: file.replace(absoluteNewPath + 'i18n/', ''),
                    data: data2,
                    isActive: true,
                }

                try {
                    await axios.post(myServer + '/api/v3/' + designID + '/i18n/native', params)
                } catch (error) {
                    console.error(error)
                    // process.exit(1)
                }
                console.log('Files ' + file + ' added to i18n');
            }
        } else {
            const data = await fs.promises.readFile(file);
            const form2 = new FormData();
            form2.append('name', file.replace(absoluteNewPath, ''));
            form2.append('isActive', 'true');
            form2.append('data', data, file.replace(absoluteNewPath, ''));

            try {
                await axios.post(myServer + '/api/v3/' + designID + '/static/native', form2, {
                    headers: {
                        ...form2.getHeaders()
                    },
                })
            } catch (error) {
                console.error(error)
                process.exit(1)
            }
            console.log('Static files ' + file + ' added');
        }
    }

    const delFiles = async function (file) {
        if (file.indexOf(".html") >= 0) {
            try {
                await axios.delete(myServer+'/api/v3/'+designID+'/template/native', { params: { name: file.replace(absoluteNewPath, '') } });
            } catch (error) {
                console.error(error)
                process.exit(1)
            }
            console.log('Files '+file+' delete');

        } else if (file.indexOf("i18n/") >= 0) {
            try {
                await axios.delete(myServer+'/api/v3/'+designID+'/i18n/native', { params: { lang: file.replace(absoluteNewPath + 'i18n/', '') } });
            } catch (error) {
                console.error(error)
                process.exit(1)
            }
            console.log('Files ' + file.replace(absoluteNewPath + 'i18n/', '') + ' delete');

        } else {
            try {
                await axios.delete(myServer + '/api/v3/' + designID + '/static/native', {params: {name: file.replace(absoluteNewPath, '')}});
            } catch (error) {
                console.error(error)
                process.exit(1)
            }
            console.log('Static files ' + file + ' delete');
        }
    }

};

exports.cli = cli;