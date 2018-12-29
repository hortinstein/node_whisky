var geodist = require('geodist')
var request = require('request');
const _ = require('lodash');
const colors = require('colors');
var convert = require('xml-js');
var rimraf = require('rimraf');
const fs = require('fs');


const myLat = 38.879318;
const myLong = -77.004846;


//console.log(dist)       
process.on('uncaughtException', function(err) {
    console.log(err);
});

var product_searches = {
    "015980": "Hibiki Harmony Whiskey"
}

var request_url_first = "https://www.abc.virginia.gov/webapi/inventory/storeNearby?storeNumber=";
var request_url_middle = "&productCode=";
var request_url_end = "&mileRadius=999&storeCount=5";

//rimraf.sync('tmp');
//fs.mkdirSync('tmp');
    

//used to output JSON to a file for later parsing.
//will use these to try to bruteforce the optimal API 
function output_string_to_file(string,store_num,product_num){
    var file_name = 'tmp/' + store_num + '_' + product_num;
    console.log(file_name);
    fs.writeFile(file_name,string,function(e,r){
        if (e) console.log(e);
    });
}

function parse_store_resp(obj){
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
    if (quantity > 0) console.log(product_id,address,'\t\t\t','\t\t\t',quantity,'\t\t\t',phone_number,'\t\t\t',dist);
}


function query_to_file(store_num,product_num){
    
    //combine the urls
    var combined_url = request_url_first + store_num + request_url_middle + product_num + request_url_end; 
    request(combined_url,function(e,r,b){
        if (r.statusMessage == 'OK'){
            //convert the xml to a json string
            var result_string = convert.xml2json(b,{compact: true, spaces: 4});
            
            var result = JSON.parse(result_string)["NearbyStoreInventoryResponseModel"]["products"];
            var products_id = result["products"]["productId"]["_text"];
            var store_id = result["products"]["storeInfo"]["storeId"]["_text"];
            output_string_to_file(result_string,store_id,products_id);

        }
    });
}

// for (var i = 0; i < 1000; i++) { 
//     var product_num = "016850";
//     var store_num = i.toString();
//     query_to_file(store_num,product_num);
// }

const testFolder = 'tmp/';

neighbor_dict = {};

fs.readdir(testFolder, (err, files) => {
  files.forEach(file => {
    var obj = JSON.parse(fs.readFileSync(testFolder+file, 'utf8'));
    //parse_store_resp(obj);
    neighbors_list = [];

    var store_id  = obj["NearbyStoreInventoryResponseModel"]["products"]["products"]["storeInfo"]["storeId"]["_text"];
    neighbors = obj["NearbyStoreInventoryResponseModel"]["products"]["products"]["nearbyStores"]["nearbyStores"];

    for (var i=0; i < neighbors.length;i++){
        neighbors_list.push(parseInt(neighbors[i]["storeId"]["_text"]));
    }
    console.log(store_id, "=>",neighbors_list)
  });
});
