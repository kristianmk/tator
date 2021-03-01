class CardData {
    /* projectId : projectId, modelData : this._modelData */
    constructor({ 
        projectId = null,
        modelData = null, 

      }){
          this.projectId = projectId;
          this._modelData = modelData;
    }

    getLocalizationsCount(){
        // Used by paginator?
    }

    async makeCardList({
        localizationTypes = [], 
        localizations = []
     }){
        this.cardList = [];
        this.localizationTypes = localizationTypes;
        await this.getCardList(localizations);
        return this.cardList;
    }

    getCardList(localizations){
        return new Promise((resolve, reject) => {
            let counter = localizations.length;
            for(let l of localizations){
                let id = l.id;
                
                //let metaDetails = this.findMetaDetails( l.meta );
                let metaDetails = {name : "sample name", type : "sample type"};

                let mediaLink = document.createElement("a");
                mediaLink.setAttribute("href", `/${this.projectId}/annotation/${l.media}`)
                mediaLink.innerHTML = `Media ID ${l.media}`;
            
                let attributes = l.attributes;
                let created = new Date(l.created_datetime);
                let modified = new Date(l.modified_datetime);

                let promises = [ 
                        this._modelData.getUser(l.modified_by),
                        this._modelData.getLocalizationGraphic(l.id)
                    ]
                
                Promise.all(promises)
                .then((respArray) => {
                    let userName = respArray[0].username;
                    let graphic = respArray[1];
            
                    let card = {
                        id,
                        metaDetails,
                        mediaLink,
                        graphic,
                        attributes,
                        created,
                        modified,
                        userName
                    };
                    //console.log(card);
                    this.cardList.push(card);
                    counter --;
                    //console.log("counter went down is now: "+counter); 
                });
                
            }
            let counterCheckout = setInterval(function(){
                //console.log("interval check for counter "+counter); 
                if(counter == 0){
                    resolve('complete');
                    clearInterval(counterCheckout);
                    return this.cardList;
                }
                }, 500)
        });
    }

    findMetaDetails(id){
        for(let lt of this.localizationTypes){
            if(lt.id == id){
                return { name: lt.name, type: lt.dtype };
            }
        }
    }
}