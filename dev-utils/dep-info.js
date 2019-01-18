const path = require('path')
const { readFileSync, writeFileSync, readdirSync } = require('fs')

function getFileContent (directory, filename) {
  var files = readdirSync(directory)
  var licenseFile = files.find(f => f.toLowerCase().startsWith(filename.toLowerCase()))
  if (licenseFile) {
    var license = readFileSync(path.join(directory, licenseFile), 'utf8')
    return license
  }
}

function generateDependencyInfo (deps, modulesPath) {
  var allLicenses = []
  deps.forEach(d => {
    var modulePath = path.join(modulesPath, d)
    var license = getFileContent(modulePath, 'LICENSE')
    var dep = {
      name: d
    }
    if (license) {
      dep.license = license
    }

    var notice = getFileContent(modulePath, 'NOTICE')
    if (notice) {
      dep.notice = notice
    }
    allLicenses.push(dep)
  })
  return allLicenses
}

function generateNotice (rootDir) {
  if (!rootDir) rootDir = './'
  const { dependencies, name } = JSON.parse(
    readFileSync(path.join(rootDir, './package.json'), 'utf8')
  )
  var depInfo = generateDependencyInfo(
    Object.keys(dependencies),
    path.join(rootDir, './node_modules')
  )
  var allLicenses = `
${name}
Copyright (c) 2017-present, Elasticsearch BV

`
  depInfo.forEach(d => {
    if (d.license || d.notice) {
      allLicenses += `
---
This product relies on ${d.name}

${d.license ? d.license : ''}

${d.notice ? d.notice : ''}`
    }
  })
  writeFileSync(path.join(rootDir, './NOTICE.txt'), allLicenses)
}

module.exports = {
  generateDependencyInfo,
  generateNotice
}
