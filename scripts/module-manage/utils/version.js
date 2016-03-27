import fs from 'fs'
import path from 'path'
import semver from 'semver'
import format from 'format-json'

let changeModules = {}
let moduleMaps = {}

const updateModuleVirtual = (modulePath, name, version) => {
    if (!changeModules[modulePath]) {
        changeModules[modulePath] = {
            modulePath: modulePath,
            name      : name,
            version   : semver.inc(version, 'patch')
        }
    }
}

const buildModuleMap = () => {
    for (let all of allModules) {
        let moduleObj = getModuleObj(all)
        moduleMaps[moduleObj.name] = {
            version     : moduleObj.version,
            name        : moduleObj.name,
            modulePath  : all,
            dependencies: []
        }
        for (var dependence in moduleObj.dependencies) {
            moduleMaps[moduleObj.name].dependencies.push({
                [dependence]: moduleObj.dependencies[dependence]
            })
        }
    }
}

const getModuleObj = (module) => {
    if (fs.existsSync(module, 'package.json')) {
        return JSON.parse(fs.readFileSync(path.resolve(module, 'package.json')).toString())
    }
    return {}
}

const whoIsNeedMe = (moduleObj)=> {
    let modules = []
    let moduleName = moduleObj.name
    for (let module in moduleMaps) {
        for (let dep of moduleMaps[module].dependencies) {
            if (dep[moduleName]) {
                modules.push({
                    modulePath   : moduleMaps[module].modulePath,
                    moduleName   : moduleMaps[module].name,
                    moduleVersion: moduleMaps[module].version
                })
            }
        }
    }

    return modules
}

const updateModule = (modulePath) => {
    let moduleObj = changeModules[modulePath] || getModuleObj(modulePath)
    updateModuleVirtual(modulePath, moduleObj.name, moduleObj.version)

    let dependences = whoIsNeedMe(moduleObj)

    for (let dep of dependences) {
        updateModule(dep.modulePath)
    }
}

const writeChanges = () => {
    for (let change in changeModules) {
        let moduleObj = getModuleObj(changeModules[change].modulePath)
        console.log(`INFO: Update ${changeModules[change].name} version ${moduleObj.version} ==> ${changeModules[change].version}`)
        moduleObj.version = changeModules[change].version

        for (let dep in moduleObj.dependencies) {
            if (moduleMaps[dep] && changeModules[moduleMaps[dep].modulePath] && (changeModules[moduleMaps[dep].modulePath].name === dep)) {
                moduleObj.dependencies[dep] = '^' + changeModules[moduleMaps[dep].modulePath].version
            }
        }

        fs.writeFileSync(path.join(changeModules[change].modulePath, 'package.json'), format.plain(moduleObj), 'utf-8')
    }
}

export default (modules, allModules) => {
    //buildModuleMap()

    for (let module of modules) {
        updateModule(path.join(__dirname, '../../..', `lib/${module.categoryName}/${module.module.path}`))
    }

    //writeChanges()
}