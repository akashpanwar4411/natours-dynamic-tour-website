class APIFeatures{
    constructor(query, queryString){
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        // ?duration=5&difficulty=easy
        const queryObj = {...this.queryString}; // creating hard copy of query object
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(el=> delete queryObj[el]);
        // we can also filter like that
        // const query =  Tour.find()
        //     .where('duration')
        //     .equals(5)
        //     .where('difficulty')
        //     .equals('easy');

        // 1B) Advanced Filtering
        // ?price[gte]=5
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
        // { difficulty: 'easy', duration: { $lte : 5 } }
        // { difficulty: 'easy', duration: { lte : 5 } }
        // we want to replace:- gte, gt, lte, lt
        
        this.query = this.query.find(JSON.parse(queryStr));
        // let query = Tour.find(JSON.parse(queryStr));

        return this;
    }

    sort() {
        // ?sort=-price,ratingAverage
        if(this.queryString.sort){
            const sortBy = this.queryString.sort.split(',').join(' ');
            // console.log(sortBy);
            this.query = this.query.sort(sortBy);  
            // sort multiple:- query.sort('price ratingsAverage')
        }else{
            this.query = this.query.sort('-createdAt');
        }

        return this;
    }

    limitFields() {
        // ?fields=-name,difficulty,duration,price

        if(this.queryString.fields){
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        }
        else{
            this.query = this.query.select('-__v');
        }

        return this;
    }

    paginate() {
        // ?page=2&limit3
        
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page-1) * limit;

        this.query = this.query.skip(skip).limit(limit);

        return this;
    }
}

module.exports = APIFeatures;