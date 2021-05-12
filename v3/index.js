const pools = require('./pools.js')



async function main() {
    const relevantPools = await pools.getRelevantPools();

    console.log(relevantPools);


}

main()
    .then((res) => {
        console.log(res);
    });
