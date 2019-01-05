var geodist = require('geodist')
var request = require('request');
const _ = require('lodash');
const colors = require('colors');
var convert = require('xml-js');
var rimraf = require('rimraf');
const fs = require('fs');

//for folder reading
const { readdirSync, statSync } = require('fs');
const { join } = require('path');


const myLat = 38.879318;
const myLong = -77.004846;

const testFolder = 'tmp/';

const dirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())

neighbor_dict = {};

const dir_list = dirs(testFolder);


//console.log(dist)       
process.on('uncaughtException', function(err) {
    console.log(err);
});    

var product_searches = {
    "015980": "Hibiki Harmony Whiskey",
    "016850": "Blantons Single Barrel",
    "017086": "Bulleit"
}    

var request_url_first = "https://www.abc.virginia.gov/webapi/inventory/storeNearby?storeNumber=";
var request_url_middle = "&productCode=";
var request_url_end = "&mileRadius=999&storeCount=5";

//used to output JSON to a file for later parsing.
//will use these to try to bruteforce the optimal API 
function output_string_to_file(output_folder,string,store_num,product_num){
    var file_name = output_folder +'/' + store_num + '_' + product_num;
    console.log(file_name);
    fs.writeFile(file_name,string,function(e,r){
        if (e) console.log(e);
    });    
}    

function parse_store_resp(obj,results_path){
    var product_id = obj["NearbyStoreInventoryResponseModel"]["products"]["products"]["productId"]["_text"];
    var quantity = obj["NearbyStoreInventoryResponseModel"]["products"]["products"]["storeInfo"]["quantity"]["_text"];
    var store_id  = obj["NearbyStoreInventoryResponseModel"]["products"]["products"]["storeInfo"]["storeId"]["_text"];
    var latitde  = obj["NearbyStoreInventoryResponseModel"]["products"]["products"]["storeInfo"]["latitude"]["_text"];
    var longitude  = obj["NearbyStoreInventoryResponseModel"]["products"]["products"]["storeInfo"]["longitude"]["_text"];
    var address  = obj["NearbyStoreInventoryResponseModel"]["products"]["products"]["storeInfo"]["address"]["_text"];
    var phone_number = obj["NearbyStoreInventoryResponseModel"]["products"]["products"]["storeInfo"]["PhoneNumber"]["FormattedPhoneNumber"]["_text"];
    
    var intQuant= parseInt(quantity);
    var floatLat = parseFloat(latitde);
    var floatLong = parseFloat(longitude);

    var me_loc = {lat: myLat, lon: myLong};
    var store_loc = {lat: floatLat, lon: floatLong}

    var dist = geodist(me_loc, store_loc)
    if (quantity > 0) {
        var result_string = product_id+'\t'+quantity+'\t'+store_id+'\t\t'+address+'\t\t'+phone_number+'\t\t'+dist;
        fs.appendFileSync(results_path, result_string + '\n');
    }
}    


function query_to_file(output_folder,store_num,product_num){
    
    //combine the urls
    var combined_url = request_url_first + store_num + request_url_middle + product_num + request_url_end; 
        request(combined_url,function(e,r,b){
        if (r != undefined && r.statusMessage == 'OK'){
            //convert the xml to a json string
            var result_string = convert.xml2json(b,{compact: true, spaces: 4});
            
            var result = JSON.parse(result_string);
            var products_id = result["NearbyStoreInventoryResponseModel"]["products"]["products"]["productId"]["_text"];
            var store_id = result["NearbyStoreInventoryResponseModel"]["products"]["products"]["storeInfo"]["storeId"]["_text"];
            output_string_to_file(output_folder,result_string,store_id,products_id);
        }    
    });    
}    

function query_all_products(product_searches){
    var output_folder = 'tmp/' + Math.floor(new Date() / 1000);
    fs.mkdirSync(output_folder);    
    for (const [product_num, product_name] of Object.entries(product_searches)) {
        console.log(product_num, product_name);
        result_path = output_folder + "/" + product_num;
        fs.mkdirSync(result_path);
        for (var i = 0; i < 500; i++) { 
            var store_num = i.toString();
            query_to_file(result_path,store_num,product_num);
        }    
    }    
}    



function parse_file(neighbors_path,results_path,fullpath){
    var obj = JSON.parse(fs.readFileSync(fullpath, 'utf8'));
    neighbors_list = [];
    parse_store_resp(obj,results_path);
    var store_id  = obj["NearbyStoreInventoryResponseModel"]["products"]["products"]["storeInfo"]["storeId"]["_text"];
    neighbors = obj["NearbyStoreInventoryResponseModel"]["products"]["products"]["nearbyStores"]["nearbyStores"];
    
    for (var i=0; i < neighbors.length;i++){
        neighbors_list.push(parseInt(neighbors[i]["storeId"]["_text"]));
    }
    var neighbors_string = store_id + "=> [" + neighbors_list.toString() + ']';
    //console.log(store_id, "=>",neighbors_list);
    fs.appendFileSync(neighbors_path, neighbors_string + '\n');
}

function parse_all_folders(){
    dir_list.forEach(dir => {
        console.log(dir);
        for (const [product_num, product_name] of Object.entries(product_searches)) {
            fs.readdir(testFolder+dir+'/'+product_num, (err, files) => {
                neighbors_path = testFolder+'/'+dir+'/neighbors_'+product_num;
                results_path = testFolder+'/'+dir+'/results_'+product_num;
                if (fs.existsSync(neighbors_path)){
                    fs.unlinkSync(neighbors_path);
                }
                if (fs.existsSync(results_path)){
                    fs.unlinkSync(results_path);
                }
                files.forEach(file => {
                    if (file != "neighbors"){
                        var fullpath = testFolder+'/'+dir+'/'+product_num+'/'+file;
                        parse_file(neighbors_path,results_path,fullpath);
                    }
                });
                
            });
        }
    });
}

//query_all_products(product_searches);
parse_all_folders();