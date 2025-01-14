class AnnotationsCard extends EntityCard {
  constructor() {
    super();

    // Add annotation class to list item
    this._li.classList.add("analysis__annotation");
    this.addEventListener("click", this.togglePanel.bind(this) );

    // prep this var
    this._tmpHidden = null;
    this.attributeDivs = {};
    this._currentShownAttributes = "";

    /* Holds attributes for the card */
    this.attributesDiv = document.createElement('div');
    this.attributesDiv.setAttribute("class", ""); //d-flex flex-wrap
  }
  

  init({obj, panelContainer, annotationPanelDiv, cardLabelsChosen}){
    this._id_text.innerHTML = `ID: ${obj.id}`;

    // Give card access to panel
    this.panelContainer = panelContainer;
    this.annotationPanelDiv = annotationPanelDiv;
    this.cardObj = obj;

    // Graphic
    if(typeof obj.image !== "undefined" && obj.image !== null) {
      //this.setAttribute("thumb", obj.image);
      this.setImageStatic(obj.image);
    } else if(typeof obj.graphic !== "undefined" && obj.graphic !== null) {
      this.reader = new FileReader();
      this.reader.readAsDataURL(obj.graphic); // converts the blob to base64
      this.reader.addEventListener("load", this._setImgSrc.bind(this));
    } else {
      //this.setAttribute("thumb", "/static/images/spinner-transparent.svg");
      this.setImageStatic("/static/images/spinner-transparent.svg");
    }

    // Add position text related to pagination
    this.setAttribute("pos-text", obj.posText);

    // Attributes hidden on card are controlled by outer menu 
    if(obj.attributeOrder && obj.attributeOrder.length > 0){
      this.attributesDiv.innerHTML = "";
      for(const attr of obj.attributeOrder){
        let attrStyleDiv = document.createElement("div");
        attrStyleDiv.setAttribute("class", `entity-gallery-card__attribute`);
        
        let attrLabel = document.createElement("span");
        attrLabel.setAttribute("class", "f3 text-gray text-normal");
        attrStyleDiv.appendChild(attrLabel);

        let key = attr.name;
        if(typeof obj.attributes[key] !== "undefined" && obj.attributes[key] !== null && obj.attributes[key] !== ""){
          attrLabel.appendChild( document.createTextNode(`${obj.attributes[key]}`) );
        } else {
          attrLabel.innerHTML =`<span class="text-dark-gray"><<span class="text-italics ">not set</span>></span>`;
        }

        // add to the card & keep a list
        this.attributeDivs[key] = {};
        this.attributeDivs[key].div = attrStyleDiv;
        this.attributeDivs[key].value = attrLabel;
        attrStyleDiv.classList.add("hidden");

        if(cardLabelsChosen && Array.isArray(cardLabelsChosen) && cardLabelsChosen.length > 0){
          // If we have any preferences saved check against it
          if(cardLabelsChosen.indexOf(key) >= 0) {
            attrStyleDiv.classList.remove("hidden");
          }
        }       

        this.attributesDiv.appendChild(attrStyleDiv);
      }

      if(this.attributeDivs){       
        // Show description div
        this.descDiv.appendChild(this.attributesDiv);
        this.descDiv.hidden = false;
      }
    }
  }

  /**
  * Custom label display update
  */
  _updateShownAttributes(evt){
    let labelValues = evt.detail.value;
    let typeId = evt.detail.typeId;
    
    // If the given typeId doesn't match this card's equivalent typeId, ignore.
    if (typeId != this.cardObj.entityType.id) {
      return;
    }

    if(this.attributeDivs){
      // show selected
      for (let [key, value] of Object.entries(this.attributeDivs)) {
        if(labelValues.includes(key)){
          value.div.classList.remove("hidden");
        } else {
          value.div.classList.add("hidden");
        }
      } 
    }
  }

  /**
   * Update Attribute Values
   * - If side panel is edited the card needs to update attributes
   */
   _updateAttributeValues(data) {
     //console.log(data);
    for (let [attr, value] of Object.entries(data.attributes)) {
      //console.log(attr);
      if(this.attributeDivs[attr] != null){
        this.attributeDivs[attr].value.innerHTML = value;
      } else {
        attrLabel.innerHTML =`<span class="text-dark-gray"><<span class="text-italics ">not set</span>></span>`;
      }
    }
  }

  set posText(val){
    this.setAttribute("pos-text", val);
  }

  displayAttributes() {
    this.setAttribute("name", "");
    for (let attrType of this.cardObj.entityType.attribute_types) {
      if (attrType.order == 0) {
        if (this.cardObj.attributes[attrType.name] != undefined) {
          this._name.textContent = this.cardObj.attributes[attrType.name];
        }
        break;
      }
    }
  }

  /**
   * Set the card's main image thumbnail
   * @param {image} image
   */
  setImage(image) {
    this.reader = new FileReader();
    this.reader.readAsDataURL(image); // converts the blob to base64
    this.reader.addEventListener("load", this._setImgSrcReader.bind(this));
  }

  _setImgSrcReader () {
    //this.setAttribute("thumb", this.reader.result);
    this._img.setAttribute("src", this.reader.result);
    this._img.onload = () => {this.dispatchEvent(new Event("loaded"))};
  }

  setImageStatic (image) {
    //this.setAttribute("thumb", this.reader.result);
    this._img.setAttribute("src", image);
    this._img.onload = () => {this.dispatchEvent(new Event("loaded"))};
  }

  _mouseEnterHandler(e){
    const isHidden = this.annotationPanelDiv.classList.contains("hidden");
    const isSelected = this.annotationPanelDiv.classList.contains("is-selected");
    if(isHidden && !isSelected) {
      //console.log(`Previewing: ${this.annotationPanelDiv.dataset.locId}`);

      // If we do not already have this open or selected... show a preview
      this._showPreview();

      // Wait for mouse out to stop preview
      const once = { once : true };
      this.addEventListener("mouseout", this._removePreview.bind(this), once );
    }
  }

  _showPreview() {

    // this._tmpHidden is null here prob bc of event scope
    const isSelected = this.panelContainer._shadow.querySelector(".is-selected");

    // Tmp Hide open panels (if it isn't the one we are on)
    if(typeof isSelected !== "undefined" && isSelected !== null && isSelected !== this.annotationPanelDiv) {
      this._tmpHidden = isSelected;
      this._tmpHidden.classList.add("hidden");
    }

    // Annotation event is listened to by the top panel and changes canvas
    this.annotationEvent("preview-annotation-start");

    // Show this panel
    //this.annotationPanelDiv.classList.remove("hidden");
    this.annotationPanelDiv.classList.add("preview");
  }

  _removePreview(e) {
    // Hide this panel
    //this.annotationPanelDiv.classList.add("hidden");
    this.annotationPanelDiv.classList.remove("preview");
    this.annotationEvent("preview-annotation-stop");

    // Restore the hidden panel
    if(typeof this._tmpHidden !== "undefined" && this._tmpHidden !== null) this._tmpHidden.classList.remove("hidden");

  }

  togglePanel(e){
    e.preventDefault();
    //console.log(`Opening: ${this.annotationPanelDiv.dataset.locId}`);
    // If they click while in preview, don't do this
    // const isInPreview = this.annotationPanelDiv.classList.contains("preview");
    // if(isInPreview) {
    //   const once = { once : true };
    //   this.removeEventListener("mouseout", this._removePreview.bind(this), once );
    // }

    if(this._li.classList.contains("is-selected")) {
      // const isInPreview = this.annotationPanelDiv.classList.contains("preview");
      // If we already have this open, toggle shut
      this._deselectedCardAndPanel();
     

    } else {
      // Hide open panels
      this._hideOpenPanel();

      // Show this content
      this._selectedCardAndPanel();
    }
  }

  _hideOpenPanel(){
    // this._tmpHidden is null here prob bc of event scope
    const openPanel = this.panelContainer._shadow.querySelector(".is-selected");
    
    // if it exists, close it!
    if(openPanel !== null) {
      openPanel.classList.add("hidden");
      openPanel.classList.remove("is-selected");
          
      let unselectedEvent = new CustomEvent("unselected");
      openPanel.dispatchEvent( unselectedEvent ); // this even unselected related card
    }
  }

  _deselectedCardAndPanel(){
    this.cardClickEvent(false);
    
    this._li.classList.remove("is-selected");
    
    this.annotationPanelDiv.classList.add("hidden");
    this.annotationPanelDiv.classList.remove("preview");
    this.annotationPanelDiv.classList.remove("is-selected");
    
    // Send event to panel to show this localization
    this.annotationEvent("hide-annotation");

    //Add back listener @TODO pausing on hover behavior -- needs work w/ canvas
    //this.addEventListener("mouseenter", this._mouseEnterHandler.bind(this) );

  }

  _selectedCardAndPanel(){
    this.cardClickEvent(true);

    // Send event to panel to show this localization
    this.annotationEvent("open-annotation");

    // Set appropriate classes on card + panel div
    this._li.classList.add("is-selected");
    this.annotationPanelDiv.classList.add("is-selected");
    this.annotationPanelDiv.classList.remove("hidden");
    this.annotationPanelDiv.classList.remove("preview");

    //remove preview listener
    this.removeEventListener("mouseenter", this._mouseEnterHandler.bind(this) );
  }

  cardClickEvent(openFlag = false){
    /* @ "card-click"*/
    //console.log("Card click event triggered (from card.js)");
    // Send event to panel to hide the localization canvas & title
    let cardClickEvent = new CustomEvent("card-click", { detail : { openFlag, cardObj : this.cardObj } });
    this.dispatchEvent( cardClickEvent );
  }

  annotationEvent(evtName){
    // Send event to panel to hide the localization
    let annotationEvent = new CustomEvent(evtName, { detail : { cardObj : this.cardObj } });
    this.panelContainer.dispatchEvent( annotationEvent );
  }

}

customElements.define("annotations-card", AnnotationsCard);
