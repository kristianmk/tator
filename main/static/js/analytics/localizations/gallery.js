class AnnotationsGallery extends EntityCardGallery {
  constructor() {
    super();
    /*
    * Add tools, headings and pagination for gallery here
    *
    */


    // * hook to add filter interface
    this._filterDiv = document.createElement("div");
    this._filterDiv.setAttribute("class", "analysis__filter");
    this._mainTop.appendChild(this._filterDiv);

    // Custom width for annotations gallery
    this.colSize = 272;
    this._ul.style.gridTemplateColumns = `repeat(auto-fill,minmax(${this.colSize}px,1fr))`;

    // Heading
    this._h3.hidden = true;
    //this._h3Text = document.createTextNode("All Annotations")
    //this._h3.appendChild( this._h3Text );

    const header = document.createElement("div");
    header.setAttribute("class", "project__header d-flex flex-items-center px-2");
    this._p.appendChild(header);

    this._name = document.createElement("h2");
    this._name.setAttribute("class", "h3 text-white"); //not a typo
    this._name.textContent = "Localizations";
    header.appendChild(this._name);

    this._numFiles = document.createElement("span");
    this._numFiles.setAttribute("class", "text-gray px-2");
    header.appendChild(this._numFiles);

    // Tools: Resize Slider to resize images
    this.resizeContainer = document.createElement("div");
    this.resizeContainer.setAttribute("class", "col-4")
    this._resizeCards = document.createElement('entity-card-resize');
    this._resizeCards._initGallery(this._ul, this.colSize);
    this.resizeContainer.appendChild( this._resizeCards );
    this._tools.appendChild( this.resizeContainer );

    // Tools: Show @aspect ratio
    this.aspectToolContainer = document.createElement("div");
    this.aspectToolContainer.setAttribute("class", "col-2")
    this._aspectToggle = document.createElement('entity-gallery-aspect-ratio');
    this.aspectToolContainer.appendChild( this._aspectToggle );
    this._tools.appendChild( this.aspectToolContainer );

    // Display options in more menu
    // Note: this is appended to filter nav in collections.js
    this._moreMenu = document.createElement("entity-gallery-more-menu");
    this._moreMenu.summary.setAttribute("class", "entity-gallery-tools--more"); // btn btn-clear btn-outline f2 px-1

    /**
      * CARD Label display options link for menu, and checkbox div
      */
    this._cardAtributeLabels = document.createElement("entity-gallery-labels");
    this._cardAtributeLabels.titleEntityTypeName = "localization";
    this._mainTop.appendChild(this._cardAtributeLabels);
    this._cardAtributeLabels.menuLinkTextSpan.innerHTML = "Localization Labels";
    this._moreMenu._menu.appendChild(this._cardAtributeLabels.menuLink);

    // Init aspect toggle
    this._aspectToggle.init(this);
    this.panelContainer = null;

    // Property IDs are the entity IDs (which are expected to be unique)
    // Each property (ID) points to the index of the card information stored in _cardElements
    this._currentCardIndexes = {};

    // Entity cards aren't deleted. They are reused and hidden if not used.
    this._cardElements = [];

    // State of chosen labels for gallery
    this.cardLabelsChosenByType = {};
  }

  // Provide access to side panel for events
  _initPanel({
    panelContainer,
    pageModal,
    cardData,
    modelData
  }){
    this.panelContainer = panelContainer;
    this.panelControls = this.panelContainer._panelTop;
    this.pageModal = pageModal;
    this.cardData = cardData;
    this.modelData = modelData;
  }

  /* Init function to show and populate gallery w/ pagination */
  show(cardList) {

   //if (cardList.total >= this.modelData.getMaxFetchCount()) {
   //   this._numFiles.textContent = `Too many results to preview. Displaying the first ${cardList.total} results.`
   //}
   //else {
   this._numFiles.textContent = `${cardList.total} Results`;
   //}

    // Only populate the pagination when the dataset has changed (and therefore the pagination
    // needs to be reinitialized)
    if (cardList.paginationState.init) {
      this._paginator.init(cardList.total, cardList.paginationState);
      this._paginator_top.init(cardList.total, cardList.paginationState);
    }

    // Hide all cards' panels and de-select
    for (let idx = 0; idx < this._cardElements.length; idx++) {
      this._cardElements[idx].card._deselectedCardAndPanel();
    }

    // Append the cardList
    this.makeCards(cardList.cards)
  }

  /**
   * Updates the specific card's thumbnail image
   * @param {integer} id
   * @param {image} image
   */
  updateCardImage(id, image) {
    if (id in this._currentCardIndexes) {
      var info = this._cardElements[this._currentCardIndexes[id]];
      info.card.setImage(image);
      // info.annotationPanel.setImage(image);
    }
  }

  /**
   * Creates the card display in the gallery portion of the page using the provided
   * localization information
   *
   * @param {object} cardInfo
   */
  makeCards(cardInfo) {
    this._currentCardIndexes = {}; // Clear the mapping from entity ID to card index
    var numberOfDisplayedCards = 0;

    // Loop through all of the card entries and create a new card if needed. Otherwise
    // apply the card entry to an existing card.
    for (const [index, cardObj] of cardInfo.entries()) {
      const newCard = index >= this._cardElements.length;

      /**
      * entity info for card
      */
      let entityType = cardObj.entityType;
      let entityTypeId = entityType.id;


      let card;
      if (newCard) {
        card = document.createElement("annotations-card");

        /**
        * Card labels / attributes of localization or media type
        */
        this._cardAtributeLabels.add({
          typeData: entityType,
          checkedFirst: true
        });

        this.cardLabelsChosenByType[entityTypeId] = this._cardAtributeLabels._getValue(entityTypeId);

        // Resize Tool needs to change style within card on change
        this._resizeCards._slideInput.addEventListener("change", (evt) => {
          let resizeValue = evt.target.value;
          let resizeValuePerc = parseFloat(resizeValue / 100);
          return card._img.style.height = `${130 * resizeValuePerc}px`;
        });

        this._cardAtributeLabels.addEventListener("labels-update", (evt) => {
          card._updateShownAttributes(evt);
          this.cardLabelsChosenByType[entityTypeId] =  evt.detail.value;
          let msg = `Entry labels updated`;
          Utilities.showSuccessIcon(msg);
        });

        // Inner div of side panel
        let annotationPanelDiv = document.createElement("div");
        annotationPanelDiv.setAttribute("class", "entity-panel--div hidden");
        this.panelContainer._shadow.appendChild(annotationPanelDiv);

        // Init a side panel that can be triggered from card
        let annotationPanel = document.createElement("entity-gallery-panel");
        annotationPanelDiv.appendChild(annotationPanel);

        // Listen for attribute changes
        annotationPanel.entityData.addEventListener("save", this.entityFormChange.bind(this));
        annotationPanel.mediaData.addEventListener("save", this.mediaFormChange.bind(this));

        // Check and set current permission level on annotationPanel
        if (this.panelContainer.hasAttribute("permissionValue")) {
          let permissionVal = this.panelContainer.getAttribute("permissionValue");
          annotationPanel.entityData.setAttribute("permission", permissionVal);
          annotationPanel.stateData.setAttribute("permission", permissionVal);
          annotationPanel.mediaData.setAttribute("permission", permissionVal);
        }

        // when lock changes set attribute on forms to "View Only" / "Can Edit"
        this.panelContainer.addEventListener("permission-update", (e) => {
          this.panelContainer.setAttribute("permissionValue", e.detail.permissionValue);
          annotationPanel.entityData.setAttribute("permission", e.detail.permissionValue);
          annotationPanel.mediaData.setAttribute("permission", e.detail.permissionValue);
        });

        // Update view
        annotationPanelDiv.addEventListener("unselected", () => {
          card._li.classList.remove("is-selected");
          annotationPanelDiv.classList.remove("is-selected");
          annotationPanelDiv.classList.add("hidden");
        });

        // Listen for all clicks on the document
        document.addEventListener('click', function (evt) {
          if (evt.target.tagName == "BODY" && card._li.classList.contains("is-selected")) {
            card._li.click();
          }
        }, false);

        // Open panel if a card is clicked
        card.addEventListener("card-click", this.openClosedPanel.bind(this)); // open if panel is closed

        // Update view
        card._li.classList.toggle("aspect-true");
        this.addEventListener("view-change", () => {
          card._li.classList.toggle("aspect-true");
        });

        cardInfo = {
          card: card,
          annotationPanel: annotationPanel,
          annotationPanelDiv: annotationPanelDiv
        };
        this._cardElements.push(cardInfo);

        this._ul.appendChild(card);
      } else {
        card = this._cardElements[index].card;
      }

      // Initialize the card panel
      this._cardElements[index].annotationPanelDiv.setAttribute("data-loc-id", cardObj.id)
      this._cardElements[index].annotationPanel.init({ cardObj });

      // Non-hidden attributes (ie order >= 0))
      let nonHiddenAttrs = [];
      let hiddenAttrs = [];
      for (let attr of entityType.attribute_types) {
        if (attr.order >= 0) {
          nonHiddenAttrs.push(attr);
        }
        else {
          hiddenAttrs.push(attr);
        }
      }

      // Show array by order, or alpha
      var cardLabelOptions = nonHiddenAttrs.sort((a, b) => {
        return a.order - b.order || a.name - b.name;
      });

      cardLabelOptions.push(...hiddenAttrs);

      cardObj.attributeOrder = cardLabelOptions;

      // Initialize Card
      card.init({
        obj : cardObj,
        panelContainer : this.panelContainer,
        annotationPanelDiv : this._cardElements[index].annotationPanelDiv,
        cardLabelsChosen: this.cardLabelsChosenByType[entityTypeId]
      });

      this._currentCardIndexes[cardObj.id] = index;

      card.style.display = "block";
      numberOfDisplayedCards += 1;
    }

    // Hide unused cards
    if (numberOfDisplayedCards < this._cardElements.length) {
      const len = this._cardElements.length;
      for (let idx = len - 1; idx >= numberOfDisplayedCards; idx--) {
        this._cardElements[idx].card.style.display = "none";
      }
    }
  }

  updateCardData(newCardData) {
    if (newCardData.id in this._currentCardIndexes) {
      const index = this._currentCardIndexes[newCardData.id];
      const card = this._cardElements[index].card;
      this.cardData.updateLocalizationAttributes(card.cardObj).then(() => {
        //card.displayAttributes();
        card._updateAttributeValues(card.cardObj)
      });
    }
  }

  entityFormChange(e) {
    this.formChange({
      id: e.detail.id,
      values: { attributes: e.detail.values },
      type: "Localization"
    }).then((data) => {
        this.updateCardData(data);
    });
  }

  mediaFormChange(e) {
    var mediaId = e.detail.id;
    this.formChange({
      id: e.detail.id,
      values: { attributes: e.detail.values },
      type: "Media"
    }).then(() => {
      this.cardData.updateMediaAttributes(mediaId).then(() => {
        for (let idx = 0; idx < this._cardElements.length; idx++) {
          const card = this._cardElements[idx].card.cardObj;
          if (card.mediaId == mediaId) {
            this._cardElements[idx].annotationPanel.setMediaData(card);
          }
        }
      });
    });
  }

  async formChange({ type, id, values } = {}) {
    var result = await fetch(`/rest/${type}/${id}`, {
      method: "PATCH",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    var data = await result.json();
    let msg = "";
    if (result.ok) {
      if (data.details && data.details.contains("Exception")) {
        msg = `Error: ${data.message}`
        Utilities.warningAlert(msg);
      } else {
        msg = `${data.message}`
        Utilities.showSuccessIcon(msg);
      }

    } else {
      if (data.message) {
        msg = `Error: ${data.message}`
      } else {
        msg = `Error saving ${type}.`
      }
      Utilities.warningAlert(msg, "#ff3e1d", false);
    }

    result = await fetch(`/rest/${type}/${id}`, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    });
    data = await result.json();
    return data;
  }

  openClosedPanel(e){
    console.log(e.target);
    if(!this.panelContainer.open) this.panelContainer._toggleOpen();
    this.panelControls.openHandler(e.detail, this._cardElements, this._currentCardIndexes);
  }
}

customElements.define("annotations-gallery", AnnotationsGallery);
