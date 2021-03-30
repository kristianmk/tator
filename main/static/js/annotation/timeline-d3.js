/**
 * Events dispatched from this element:
 * #TODO Eventually should allow select?
 */
class TimelineD3 extends TatorElement {
  constructor() {
    super();

    this._mainTimelineDiv = document.createElement("div");
    this._mainTimelineDiv.setAttribute("class", "py-2");
    this._mainTimelineDiv.id = "main-timeline";
    this._shadow.appendChild(this._mainTimelineDiv);

    this._focusTimelineDiv = document.createElement("div");
    this._focusTimelineDiv.setAttribute("class", "");
    this._focusTimelineDiv.id = "focus-timeline";
    this._shadow.appendChild(this._focusTimelineDiv);

    this._mainSvg = d3.select(this._shadow).select("#main-timeline")
      .append("svg")
      //.attr("preserveAspectRatio", "xMinYMid meet")
      .style("font", "12px sans-serif")
      .style("color", "#a2afcd");

    this._focusSvg = d3.select(this._shadow).select("#focus-timeline")
      .append("svg")
      //.attr("preserveAspectRatio", "xMinYMid meet")
      .style("font", "12px sans-serif")
      .style("color", "#a2afcd");

    this._focusLine = this._focusSvg.append("g").attr("display", "none");

    // Initially hide the focus timeline. Some external UI element will control
    // whether or not to display this.
    this._focusTimelineDiv.style.display = "none";

    // Redraw whenever there's a resize
    this._stateData = [];
    this._numericalData = [];
    window.addEventListener("resize", () => {this._updateSvgData()});
  }

  /**
   * Set a pointer to the global data storage and setup event listeners when
   * there is new data.
   * @param {AnnotationData} val - Tator data singleton that contains the annotations
   */
  set annotationData(val) {
    this._data = val;

    this._data.addEventListener("freshData", evt => {
      this._setupAttrStyleRangeTypes();
      this._updateData();
    });

    this._data.addEventListener("initialized", evt => {
      this._setupAttrStyleRangeTypes();
      this._updateData();
    });
  }

  /**
   * Sets the object that will eventually contain the frame range to display.
   * This will be used to define the maximum frame.
   *
   * @param {Object} val - Object that needs to have a "max" attribute that will return a frame
   *                       An example of this is the SeekBar TatorElement
   */
  set rangeInput(val) {
    this._rangeInput = val;
  }

  /**
   * @returns {integer} Maximum frame to display on the timeline. If unknown, this will be null.
   */
  _getMaxFrame() {
    if (typeof this._rangeInput === "undefined") {
      return null;
    }

    return parseInt(this._rangeInput.getAttribute("max"));
  }

  /**
   * Expected that state types will not change within the annotator/usage of this timeline.
   * Therefore, run this once at initialization.
   *
   * @postcondition this._attrStyleRangeTypes is set
   */
  _setupAttrStyleRangeTypes() {

    if (this._attrStyleRangeTypes != undefined) {
      return;
    }

    this._attrStyleRangeTypes = [];

    for (let typeId in this._data._dataTypes) {

      // Grab the dataType and if this is not a state type, then ignore it
      const dataType = this._data._dataTypes[typeId];
      if (dataType.isLocalization) {
        continue;
      }

      if (dataType.interpolation == "attr_style_range") {
        // To support attr_style_range, there must at least be one set of
        // start_frame|end_frame style attributes. Grab the start_frame/end_frame info.
        //
        // There can actually be multiple start_frame|end_frame pairs. If this is the case,
        // there has to be a range associated. If not, then don't show anything and throw a
        // warning
        var startFrameAttr;
        var endFrameAttr;
        var startFrameCheckAttr;
        var endFrameCheckAttr;
        var inVideoCheckAttr;
        var inVideoCheckAttrList = [];
        var startFrameAttrList = [];
        var endFrameAttrList = [];
        var rangeList = [];

        for (const attr of dataType.attribute_types) {
          const style = attr['style'];

          if (style) {

            const styleOptions = style.split(' ');
            const name = attr['name'];

            if (styleOptions.includes("start_frame")) {
              startFrameAttrList.push(name);
            }
            else if (styleOptions.includes("end_frame")) {
              endFrameAttrList.push(name);
            }
            else if (styleOptions.includes("start_frame_check")) {
              startFrameCheckAttr = name;
            }
            else if (styleOptions.includes("end_frame_check")) {
              endFrameCheckAttr = name;
            }
            else if (styleOptions.includes("in_video_check")) {
              inVideoCheckAttrList.push(name);
            }
            else if (styleOptions.includes("range_set")) {
              rangeList.push({name: name, data: attr["default"], order: attr["order"]});
            }
          }
        }

        if (startFrameAttrList.length == 1 && endFrameAttrList.length == 1) {
          startFrameAttr = startFrameAttrList[0];
          endFrameAttr = endFrameAttrList[0]
          inVideoCheckAttr = null;

          this._attrStyleRangeTypes.push({
            dataType: dataType,
            name: dataType.name,
            startFrameAttr: startFrameAttr,
            endFrameAttr: endFrameAttr,
            startFrameCheckAttr: startFrameCheckAttr,
            endFrameCheckAttr: endFrameCheckAttr,
            inVideoCheckAttr: inVideoCheckAttr
          });
        }
        else if (startFrameAttrList.length > 1 &&
          endFrameAttrList.length > 1 &&
          startFrameAttrList.length == endFrameAttrList.length &&
          startFrameAttrList.length == rangeList.length) {

          rangeList.sort(function(a, b) {
              if (a.order < b.order) {
                return 1;
              }
              if (a.order > b.order) {
                return -1;
              }
              return 0;
            }
          );

          for (const rangeInfo of rangeList) {
            const rangeTokens = rangeInfo.data.split('|');

            if (rangeTokens.length < 2 && rangeTokens.length > 3) {
              console.error("Incorrect datatype setup with attr_style_range interpolation.")
              break;
            }

            startFrameAttr = rangeTokens[0];
            endFrameAttr = rangeTokens[1];
            inVideoCheckAttr = null;

            if (rangeTokens.length == 3) {
              if (inVideoCheckAttrList.includes(rangeTokens[2])) {
                inVideoCheckAttr = rangeTokens[2];
              }
            }

            if (!startFrameAttrList.includes(startFrameAttr)) {
              console.error("Incorrect datatype setup with attr_style_range interpolation.")
              break;
            }

            if (!endFrameAttrList.includes(endFrameAttr)) {
              console.error("Incorrect datatype setup with attr_style_range interpolation.")
              break;
            }

            this._attrStyleRangeTypes.push({
              dataType: dataType,
              name: rangeInfo.name,
              startFrameAttr: startFrameAttr,
              endFrameAttr: endFrameAttr,
              startFrameCheckAttr: null,
              endFrameCheckAttr: null,
              inVideoCheckAttr: inVideoCheckAttr
            });
          }
        }
        else {
          console.error("Incorrect datatype setup with attr_style_range interpolation.")
          continue;
        }
      }
    }
  }

  /**
   * Called whenever there's been a notification of new data. This will update the GUI.
   */
  _updateData() {

    // Recreate the state and numerical datasets
    this._numericalData = [];
    this._stateData = [];
    var maxFrame = this._getMaxFrame();
    if (isNaN(maxFrame)) {
      this.showMain(false);
      this.showFocus(false);
      return;
    }

    for (let typeId in this._data._dataTypes) {

      // Grab the dataType and if this is not a state type, then ignore it
      const dataType = this._data._dataTypes[typeId];
      if (dataType.isLocalization) {
        continue;
      }

      if (dataType.interpolation == "latest") {
        let allData = this._data._dataByType.get(typeId);
        if (!allData) {
          continue;
        }

        // Get the attributes we care about (the bools) and save off that data
        // in the format expected by the graphics
        let sortedAttributeTypes = dataType.attribute_types;
        sortedAttributeTypes.sort((a,b) => {return a.order - b.order});
        for (let attrType of sortedAttributeTypes) {
          if (attrType.dtype == "bool") {

            // Collect all the data for this attribute
            let graphData = [];
            for (let data of allData) {
              let value = data.attributes[attrType.name];
              let graphValue;
              if (!value) {
                value = false;
                graphValue = 0.0;
              }
              else {
                graphValue = 1.0;
              }
              graphData.push({frame: data.frame, value: graphValue, actualValue: value});
            }

            // If there's data then add it to the plot dataset
            if (graphData.length > 0) {

              // Add a point at the last frame to draw the state all the way to the end
              graphData.sort((a,b) => {return a.frame - b.frame});
              graphData.push({...graphData[graphData.length - 1]});
              graphData[graphData.length - 1].frame = maxFrame;

              if (graphData[0].frame != 0) {
                graphData.unshift({frame: 0, value: 0.0, actualValue: false});
              }

              this._stateData.push({
                name: attrType.name,
                graphData: graphData
              });
            }
          }
          // #TODO This is a temporary fix until display_timeline is the nominal method
          //       Typically, the first conditional would check if style exists and the
          //       next would be attrType.style == "display_timeline"
          else if (attrType.dtype == "float") {
            if (attrType.dtype == "float") {
              // Display this attribute as a numerical graph.
              // Normalize the data because the graph domain is from 0 to 1.
              let graphData = [];
              let maxValue = 0.0;
              for (let data of allData) {
                let value = data.attributes[attrType.name];
                if (!isNaN(value)) {
                  if (value > maxValue) {
                    maxValue = value;
                  }
                  graphData.push({frame: data.frame, value: 0.0, actualValue: value});
                }
              }

              // If there's data then add it to the plot dataset
              // #TODO Might need to handle negative numbers
              // #TODO Use min/max values defined by the attribute type if available
              if (graphData.length > 0) {

                for (let idx = 0; idx < graphData.length; idx++) {
                  graphData[idx].value = graphData[idx].actualValue / maxValue;
                }

                // Add a point at the last frame to draw the state all the way to the end
                // #TODO Not sure if this is needed
                graphData.sort((a,b) => {return a.frame - b.frame});
                graphData.push({...graphData[graphData.length - 1]});
                graphData[graphData.length - 1].frame = maxFrame;

                this._numericalData.push({
                  name: attrType.name,
                  graphData: graphData
                });
              }
            }
          }
        }
      }
    }

    // Have to loop over the stored _attrStyleRangeTypes separately from the dataTypes
    // since we treat each start/end range separately in the graph.
    for (let attrTypeInfo of this._attrStyleRangeTypes) {
      // We've already figured out how the attributes are connected to each other earlier
      // with _setupAttrStyleRangeTypes()
      let allData = this._data._dataByType.get(attrTypeInfo.dataType.id);
      if (!allData) {
        continue;
      }

      let graphData = [];
      for (let data of allData) {
        let startFrame = data.attributes[attrTypeInfo.startFrameAttr];
        let endFrame = data.attributes[attrTypeInfo.endFrameAttr];

        if (attrTypeInfo.startFrameCheckAttr && attrTypeInfo.endFrameCheckAttr) {
          // Start frame check and end frame check attributes exist.
          // #TODO This capability may go away in lieu of just using -1 values.
          if (data.attributes[attrTypeInfo.startFrameCheckAttr] === false) {
            startFrame = 0;
          }
          if (data.attributes[attrTypeInfo.endFrameCheckAttr] === false) {
            endFrame = maxFrame;
          }
        }
        else {
          // Start/end frame check attributes don't exist.
          // Just assume if there's a -1, it's going to stretch
          if (startFrame == -1) {
            startFrame = 0;
          }

          if (endFrame == -1) {
            endFrame = maxFrame;
          }
        }

        if (attrTypeInfo.inVideoCheckAttr) {
          // A "in video check" attribute is there. Don't draw if this value is false.
          if (data.attributes[attrTypeInfo.inVideoCheckAttr] === false) {
            continue;
          }
        }

        if (startFrame > -1 && endFrame > -1 && startFrame <= endFrame) {
          // Save the graphData to the state data list
          graphData.push({frame: startFrame, value: 1.0, actualValue: true});
          graphData.push({frame: endFrame, value: 0.0, actualValue: false});
        }
      }

      // If there's data then add it to the plot dataset
      if (graphData.length > 0) {

        // Add a point at the last frame to draw the state all the way to the end
        graphData.sort((a,b) => {return a.frame - b.frame});
        graphData.push({...graphData[graphData.length - 1]});
        graphData[graphData.length - 1].frame = maxFrame;

        if (graphData[0].frame != 0) {
          graphData.unshift({frame: 0, value: 0.0, actualValue: "false"});
        }

        this._stateData.push({
          name: attrTypeInfo.name,
          graphData: graphData
        });
      }
    }

    // With the datasets updated, update the timeline plots
    if (this._numericalData.length > 0 || this._stateData.length > 0) {
      this.showMain(true);
      this._updateSvgData();
    }
    else {
      this.showMain(false);
    }
  }

  /**
   * Used in making unique identifiers for the various d3 graphing elements
   * @returns {object} id, href properties
   */
  _d3UID() {
    var id = uuidv1();
    var href = new URL(`#${id}`, location) + "";
    return {id: id, href: href};
  }

  /**
   * Called whenever there's new data to be displayed on the timelines
   */
  _updateSvgData() {

    var maxFrame = this._getMaxFrame();
    if (isNaN(maxFrame)) {
      return;
    }

    const mainStep = 10; // vertical height of each entry in the series / band
    const mainMargin = ({top: 20, right: 3, bottom: 3, left: 3});
    const mainHeight =
      this._numericalData.length * (mainStep + 1) +
      this._stateData.length * (mainStep + 1) +
      mainMargin.top + mainMargin.bottom;
    const mainWidth = this._mainTimelineDiv.clientWidth;
    this._mainWidth = mainWidth;
    this._mainSvg.attr("viewBox",`0 0 ${mainWidth} ${mainHeight}`);

    // Define the axes
    var mainX = d3.scaleLinear()
      .domain([0, maxFrame])
      .range([0, mainWidth])
    this._mainX = mainX;

    var mainY = d3.scaleLinear()
      .domain([0, 1.0])
      .range([0, -mainStep]);

    // #TODO This is clunky and has no smooth transition, but it works for our application
    //       Potentially worth revisiting in the future and updating the dataset directly
    //       using the traditional d3 enter/update/exit paradigm.
    this._mainSvg.selectAll('*').remove();

    // Frame number x-axis ticks
    var xAxis = g => g
      .attr("transform", `translate(0,${mainMargin.top})`)
      .call(d3.axisTop(mainX).ticks().tickSizeOuter(0).tickFormat(d3.format("d")))
      .call(g => g.selectAll(".tick").filter(d => mainX(d) < mainMargin.left || mainX(d) >= mainWidth - mainMargin.right).remove())
      .call(g => g.select(".domain").remove());

    // States are represented as area graphs
    var area = d3.area()
      .curve(d3.curveStepAfter)
      .x(d => mainX(d.frame))
      .y0(0)
      .y1(d => mainY(d.value));

    var mainStateDataset = this._stateData.map(d => Object.assign({
      clipId: this._d3UID(),
      pathId: this._d3UID(),
    }, d));

    const gState = this._mainSvg.append("g")
      .selectAll("g")
      .data(mainStateDataset)
      .join("g")
        .attr("transform", (d, i) => `translate(0,${i * (mainStep + 2) + mainMargin.top})`);

    gState.append("clipPath")
      .attr("id", d => d.clipId.id)
      .append("rect")
        .attr("width", mainWidth)
        .attr("height", mainStep);

    gState.append("defs").append("path")
      .attr("id", d => d.pathId.id)
      .attr("d", d => area(d.graphData));

    gState.append("rect")
      .attr("clip-path", d => d.clipId)
      .attr("fill", "#262e3d")
      .attr("width", mainWidth)
      .attr("height", mainStep);

    gState.append("g")
        .attr("clip-path", d => d.clipId)
      .selectAll("use")
      .data(d => new Array(1).fill(d))
      .join("use")
        .attr("fill", (d, i) => "#797991")
        .attr("transform", (d, i) => `translate(0,${(i + 1) * mainStep})`)
        .attr("xlink:href", d => d.pathId.href);

    // Numerical data are represented as line graphs
    var mainLineDataset = this._numericalData.map(d => Object.assign({
      clipId: this._d3UID(),
      pathId: this._d3UID(),
    }, d));

    var line = d3.line()
      .curve(d3.curveStepAfter)
      .x(d => mainX(d.frame))
      .y(d => mainY(d.value));

    const gLine = this._mainSvg.append("g")
      .selectAll("g")
      .data(mainLineDataset)
      .join("g")
        .attr("transform", (d, i) => `translate(0,${(i + this._stateData.length) * (mainStep + 2) + mainMargin.top})`);

    gLine.append("clipPath")
      .attr("id", d => d.clipId.id)
      .append("rect")
        .attr("width", mainWidth)
        .attr("height", mainStep);

    gLine.append("defs").append("path")
      .attr("id", d => d.pathId.id)
      .attr("d", d => line(d.graphData));

    gLine.append("rect")
      .attr("clip-path", d => d.clipId)
      .attr("fill", "#262e3d")
      .attr("width", mainWidth)
      .attr("height", mainStep);

    gLine.append("g")
        .attr("clip-path", d => d.clipId)
      .selectAll("use")
      .data(d => new Array(1).fill(d))
      .join("use")
        .attr("stroke", (d, i) => "#797991")
        .attr("fill", (d, i) => "none")
        .attr("transform", (d, i) => `translate(0,${(i + 1) * mainStep})`)
        .attr("xlink:href", d => d.pathId.href)

    this._mainSvg.append("g")
      .call(xAxis);

    // Setup the brush to focus/zoom on the main timeline
    this._mainBrush = d3.brushX()
      .extent([[mainMargin.left, 0.5], [mainWidth - mainMargin.right, mainHeight - mainMargin.bottom + 0.5]])
      .on("end", this._mainBrushEnded.bind(this))
      .on("brush", this._mainBrushed.bind(this));

    // The brush will default to nothing being selected
    this._mainBrushG = this._mainSvg.append("g")
      .call(this._mainBrush)
      .call(this._mainBrush.move, [-1, -1]);
  }

  /**
   * Callback for "brush" with d3.brushX
   * This recreates the focusSVG/timeline with the dataset the brush on the mainSVG covers
   * @param {array} selection Mouse pointer event
   */
  _mainBrushed ({selection}) {

    if (!selection) {
      return;
    }

    // Selection is an array of startX and stopX
    // Use this to update the x-axis of the focus panel
    const focusStep = 20; // vertical height of each entry in the series / band
    const focusMargin = ({top: 20, right: 5, bottom: 15, left: 5});
    const focusHeight =
      this._numericalData.length * (focusStep + 1) +
      this._stateData.length * (focusStep + 1) +
      focusMargin.top + focusMargin.bottom;
    const focusWidth = this._mainWidth;
    this._focusSvg.attr("viewBox",`0 0 ${focusWidth} ${focusHeight}`);

    // Define the axes
    var minFrame = this._mainX.invert(selection[0]);
    var focusX = d3.scaleLinear()
      .domain([this._mainX.invert(selection[0]), this._mainX.invert(selection[1])])
      .range([0, focusWidth]);

    var focusY = d3.scaleLinear()
      .domain([0, 1.0])
      .range([0, -focusStep]);

    // #TODO This is clunky and has no smooth transition, but it works for our application
    //       Potentially worth revisiting in the future and updating the dataset directly
    //       using the traditional d3 enter/update/exit paradigm.
    this._focusSvg.selectAll('*').remove();

    // X-axis that will be displayed to visualize the frame numbers
    var focusXAxis = g => g
      .attr("transform", `translate(0,${focusMargin.top})`)
      .call(d3.axisTop(focusX).ticks().tickSizeOuter(0).tickFormat(d3.format("d")))
      .call(g => g.selectAll(".tick").filter(d => focusX(d) < focusMargin.left || focusX(d) >= focusWidth - focusMargin.right).remove())
      .call(g => g.select(".domain").remove());

    // States are represented as area graphs
    var focusArea = d3.area()
      .curve(d3.curveStepAfter)
      .x(d => focusX(d.frame))
      .y0(0)
      .y1(d => focusY(d.value));

    var focusLine = d3.line()
      .curve(d3.curveStepAfter)
      .x(d => focusX(d.frame))
      .y(d => focusY(d.value));

    var focusStateDataset = this._stateData.map(d => Object.assign({
        clipId: this._d3UID(),
        pathId: this._d3UID(),
        textId: this._d3UID()
      }, d));

    const focusG = this._focusSvg.append("g")
      .selectAll("g")
      .data(focusStateDataset)
      .join("g")
        .attr("transform", (d, i) => `translate(0,${i * (focusStep + 4) + focusMargin.top})`);

    focusG.append("clipPath")
      .attr("id", d => d.clipId.id)
      .append("rect")
        .attr("width", focusWidth)
        .attr("height", focusStep);

    if (minFrame > -1) {
      focusG.append("defs").append("path")
        .attr("id", d => d.pathId.id)
        .attr("d", d => focusArea(d.graphData));
    }

    focusG.append("rect")
      .attr("clip-path", d => d.clipId)
      .attr("fill", "#262e3d")
      .attr("width", focusWidth)
      .attr("height", focusStep);

    focusG.append("g")
        .attr("clip-path", d => d.clipId)
      .selectAll("use")
      .data(d => new Array(1).fill(d))
      .join("use")
        .attr("fill", (d, i) => "#797991")
        .attr("transform", (d, i) => `translate(0,${(i + 1) * focusStep})`)
        .attr("xlink:href", d => d.pathId.href);

    // Unlike the main SVG, this SVG will display the corresponding attribute name
    // and the value when the user hovers over the SVG
    focusG.append("text")
        .attr("x", 4)
        .attr("y", focusStep / 2)
        .attr("dy", "0.5em")
        .attr("fill", "#fafafa")
        .text(d => d.name);

    const focusStateValues = focusG.append("text")
        .attr("class", "focusStateValues")
        .attr("x", focusWidth * 0.2)
        .attr("y", focusStep / 2)
        .attr("dy", "0.5em")
        .attr("fill", "#fafafa");

    // States are represented as line graphs
    var focusLineDataset = this._numericalData.map(d => Object.assign({
        clipId: this._d3UID(),
        pathId: this._d3UID(),
        textId: this._d3UID()
      }, d));

    const focusGLine = this._focusSvg.append("g")
      .selectAll("g")
      .data(focusLineDataset)
      .join("g")
        .attr("transform", (d, i) => `translate(0,${(i + this._stateData.length) * (focusStep + 4) + focusMargin.top})`);

    focusGLine.append("clipPath")
      .attr("id", d => d.clipId.id)
      .append("rect")
        .attr("width", focusWidth)
        .attr("height", focusStep);

    if (minFrame > -1){
      focusGLine.append("defs").append("path")
      .attr("id", d => d.pathId.id)
      .attr("d", d => focusLine(d.graphData));
    }

    focusGLine.append("rect")
      .attr("clip-path", d => d.clipId)
      .attr("fill", "#262e3d")
      .attr("width", focusWidth)
      .attr("height", focusStep);

    focusGLine.append("g")
        .attr("clip-path", d => d.clipId)
      .selectAll("use")
      .data(d => new Array(1).fill(d))
      .join("use")
        .attr("stroke", (d, i) => "#797991")
        .attr("fill", (d, i) => "none")
        .attr("transform", (d, i) => `translate(0,${(i + 1) * focusStep})`)
        .attr("xlink:href", d => d.pathId.href)

    // Unlike the main SVG, this SVG will display the corresponding attribute name
    // and the value when the user hovers over the SVG
    focusGLine.append("text")
        .attr("x", 4)
        .attr("y", focusStep / 2)
        .attr("dy", "0.5em")
        .attr("fill", "#fafafa")
        .text(d => d.name);

    const focusLineValues = focusGLine.append("text")
        .attr("class", "focusLineValues")
        .attr("x", focusWidth * 0.2)
        .attr("y", focusStep / 2)
        .attr("dy", "0.5em")
        .attr("fill", "#fafafa");

    // Apply the x-axis ticks at the end, after the other graphics have been filled in
    var displayXAxis = selection[0] >= 0;
    if (displayXAxis) {
      var focusXAxisG = this._focusSvg.append("g")
        .call(focusXAxis);

      var focusFrameTextBackground = focusXAxisG.append("rect")
        .attr("width", focusWidth)
        .attr("height", focusStep);

      var focusFrameText = focusXAxisG.append("text")
        .attr("x", focusWidth * 0.1)
        .attr("y", -focusStep / 2)
        .attr("dy", "0.35em")
        .attr("fill", "#fafafa");
    }

    // Create the vertical line hover
    const mouseLine = this._focusSvg.append("line")
      .attr("stroke", "#fafafa")
      .attr("stroke-width", 1)
      .attr("opacity", "0");

    var that = this;
    this._focusSvg.on("click", function(event, d) {

      const selectedFrame = focusX.invert(d3.pointer(event)[0]);
      const maxFrame = that._getMaxFrame();

      if (selectedFrame >= 0 && selectedFrame <= maxFrame) {
        that.dispatchEvent(new CustomEvent("select", {
          detail: {
            frame: selectedFrame
          }
        }));
      }
    });
    this._focusSvg.on("mouseover", function(event, d) {
        mouseLine.attr("opacity", "0.5");
    });
    this._focusSvg.on("mouseout", function(event, d) {
        mouseLine.attr("opacity", "0");
    });
    this._focusSvg.on("mousemove", function(event, d) {
        mouseLine
          .attr("opacity", "0.5")
          .attr("x1", d3.pointer(event)[0])
          .attr("x2", d3.pointer(event)[0])
          .attr("y1", -focusStep - focusMargin.bottom)
          .attr("y2", focusHeight);

        if (displayXAxis) {
          focusFrameText.attr("opacity", "1.0");
          focusFrameText.attr("x", d3.pointer(event)[0]);
          focusFrameText.text(parseInt(focusX.invert(d3.pointer(event)[0])));
          var textBBox = focusFrameText.node().getBBox();

          focusFrameTextBackground.attr("opacity", "1.0")
          focusFrameTextBackground.attr("x", textBBox.x);
          focusFrameTextBackground.attr("y", textBBox.y);
          focusFrameTextBackground.attr("width", textBBox.width);
          focusFrameTextBackground.attr("height", textBBox.height);
          focusFrameTextBackground.attr("fill", "#151b28");
        }

        let idx;
        let currentFrame = focusX.invert(d3.pointer(event)[0]);

        focusLineValues.attr("opactiy", "1.0");
        focusLineValues.text(function(d) {
          for (idx = 0; idx < d.graphData.length; idx++) {
            if (d.graphData[idx].frame > currentFrame) {
              if (idx > 0) {
                return String(d.graphData[idx - 1].actualValue);
              }
            }
          }
          return "";
        });

        focusStateValues.attr("opactiy", "1.0");
        focusStateValues.text(function(d) {
          for (idx = 0; idx < d.graphData.length; idx++) {
            if (d.graphData[idx].frame > currentFrame) {
              if (idx > 0) {
                return String(d.graphData[idx - 1].actualValue);
              }
            }
          }
          return "";
        });
    });
  }

  /**
   * Callback for "end" with d3.brushX
   * @param {array} selection Mouse pointer event
   */
  _mainBrushEnded ({selection}) {
    if (!selection) {
      this._mainBrushG.call(this._mainBrush.move, [-1, -1]);
    }
  }

  /**
   *
   * @param {bool} display True if the main timeline should be displayed. False otherwise.
   */
  showMain(display) {
    if (display) {
      this._mainTimelineDiv.style.display = "block";
    }
    else {
      this._mainTimelineDiv.style.display = "none";
    }
  }

  /**
   *
   * @param {bool} display True if the focus timeline should be displayed. False otherwise.
   */
  showFocus(display) {
    if (display) {
      this._focusTimelineDiv.style.display = "block";
    }
    else {
      this._focusTimelineDiv.style.display = "none";
    }
    this._updateSvgData();
  }

  /**
   * #TODO Implement in the future. This will highlight a particular region
   */
  selectData(data) {
    return;
  }

}

customElements.define("timeline-d3", TimelineD3);
