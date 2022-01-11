module.exports = fn =>{
    return (req, res, next)=>{
        fn(req, res, next).catch(next); // hear writing next is same as writing err => next(err)
    };
};