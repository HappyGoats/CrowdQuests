import React, {Fragment, PureComponent} from "react";
import {BrowserRouter as Router, Link, Redirect, Route, Switch} from "react-router-dom";
import Dexie from "dexie";
import L from "leaflet";
import "leaflet.locatecontrol";
import {LayersControl, Map, MapControl, Marker, ScaleControl, TileLayer, withLeaflet, ZoomControl} from "react-leaflet";
import "./App.css";
import MediaRecorder from "audio-recorder-polyfill";
import carto from "@carto/carto.js";

const db = new Dexie("CrowdQuests");
db.version(1).stores({
                         markers: "++id"
                     });

if (!localStorage.points) {
    localStorage.points = Math.round(200 + Math.random() * 800);
}

class StartScreen extends PureComponent {
    render() {
        return (
            <div className="cq-start">
                <img src="/images/ShieldOnly.png" alt="Logo" width={160}/>
                <div className="cq-start-text">Save the world by going on quests and capturing any changes. Gain points and gems
                    along the way.
                </div>
                <Link to="/map" className="cq-button">Start the adventure ▶</Link>
            </div>
        );
    }
}

class LocateControlImpl extends MapControl {
    createLeafletElement(props) {
        const {options, startDirectly} = props;
        const {map}                    = props.leaflet;
        const lc                       = L.control.locate(options).addTo(map);

        if (startDirectly) {
            setTimeout(() => {
                lc.start()
            }, 0);
        }
        return lc;
    }
}

const LocateControl = withLeaflet(LocateControlImpl);


class CartoImpl extends MapControl {
    createLeafletElement(props) {
        const {dataset, css, username, sql} = props;
        const {map}                    = props.leaflet;

        const client = new carto.Client({
                                            apiKey:   'default_public',
                                            username: username
                                        });

        let source;

        if(sql){
            source = new carto.source.SQL(sql);
        }else if(dataset){
            source = new carto.source.Dataset(dataset);
        }

        const style  = new carto.style.CartoCSS(css);
        const layer  = new carto.layer.Layer(source, style, {
            featureClickColumns: ['name', 'type']
        });

        client.addLayer(layer);
        const lc = client.getLeafletLayer().addTo(map);

        const popup = L.popup({ closeButton: false });
        layer.on(carto.layer.events.FEATURE_OVER, featureEvent => {
            popup.setLatLng(featureEvent.latLng);
            popup.setContent(`<b>${featureEvent.data.name}</b><br />${featureEvent.data.type}`);
            if (!popup.isOpen()) {
                popup.openOn(map);
            }
        });

        lc.setZIndex(9);

        return lc;
    }
}

const CartoControl = withLeaflet(CartoImpl);

class MapMarker extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        const {latlng, photoURL, audioURL} = this.props;

        const onMouseOver = () => this.setState({hover: true});
        const onMouseOut  = () => this.setState({hover: false});
        const stop        = () => {
            this.setState({playing: false});
            this.audio = null;
        };
        const onClick     = () => {
            if (!this.audio || !this.state.playing) {
                this.audio = new Audio(audioURL);
                this.audio.addEventListener("ended", stop);
                this.audio.addEventListener("pause", stop);
                this.audio.play();
                this.setState({playing: true});
            } else {
                this.audio.pause();
            }
        };

        return <Fragment>
            <Marker position={JSON.parse(latlng)}
                    onClick={onClick}
                    onMouseOver={onMouseOver}
                    onMouseOut={onMouseOut}
                    icon={L.icon({iconUrl: photoURL, iconSize: [64, 48], iconAnchor: [32, 24]})}/>
            {this.state.playing ?
             <Marker opacity={0.5}
                     position={JSON.parse(latlng)}
                     icon={L.icon({
                                      iconUrl:    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTIwMCIgaGVpZ2h0PSIxMjAwIiB2aWV3Qm94PSIwIDAgMTIwMCAxMjAwIj48Zz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2MDAgNjAwKSBzY2FsZSgwLjY5IDAuNjkpIHJvdGF0ZSgwKSB0cmFuc2xhdGUoLTYwMCAtNjAwKSIgc3R5bGU9ImZpbGw6I2ZmZmZmZjsiPjxzdmcgZmlsbD0iI2ZmZmZmZiIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIiB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIgdmVyc2lvbj0iMS4xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDEwMCAxMDAiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsLTk1Mi4zNjIxOCkiPjxyZWN0IHN0eWxlPSJvcGFjaXR5OjE7Y29sb3I6IzAwMDAwMDtmaWxsOiNmZmZmZmY7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjQ7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLW9wYWNpdHk6MTtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLWRhc2hvZmZzZXQ6MDttYXJrZXI6bm9uZTt2aXNpYmlsaXR5OnZpc2libGU7ZGlzcGxheTppbmxpbmU7b3ZlcmZsb3c6dmlzaWJsZTtlbmFibGUtYmFja2dyb3VuZDphY2N1bXVsYXRlIiB3aWR0aD0iNzYiIGhlaWdodD0iNzYiIHg9IjEyIiB5PSI5NjQuMzYyMTgiPjwvcmVjdD48L2c+PC9zdmc+PC9nPjwvZz48L3N2Zz4=",
                                      iconSize:   [48, 48],
                                      iconAnchor: [24, 24],
                                      className:  "cq-marker-state"
                                  })}/> :
             this.state.hover ?
             <Marker opacity={0.5}
                     position={JSON.parse(latlng)}
                     icon={L.icon({
                                      iconUrl:    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTIwMCIgaGVpZ2h0PSIxMjAwIiB2aWV3Qm94PSIwIDAgMTIwMCAxMjAwIj48Zz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2MDAgNjAwKSBzY2FsZSgwLjY5IDAuNjkpIHJvdGF0ZSgwKSB0cmFuc2xhdGUoLTYwMCAtNjAwKSIgc3R5bGU9ImZpbGw6I0ZGRkZGRjsiPjxzdmcgZmlsbD0iI0ZGRkZGRiIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIiB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIgdmVyc2lvbj0iMS4xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDEwMCAxMDAiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsLTk1Mi4zNjIxOCkiPjxwYXRoIHRyYW5zZm9ybT0ibWF0cml4KDAsLTIuMTkzOTMxLDIuMTMzMzMzMywwLC0yMi42NjY2NjUsMTA1Ny4yMTA1KSIgZD0iTSAyNS4wMDAwMDEsNTAgMTYuMzM5NzQ2LDM1IDcuNjc5NDkxNywyMCAyNSwyMCA0Mi4zMjA1MDgsMjAgMzMuNjYwMjU0LDM1IHoiIHN0eWxlPSJvcGFjaXR5OjE7Y29sb3I6IzAwMDAwMDtmaWxsOiNGRkZGRkY7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuODQ4OTI0MjgwMDAwMDAwMTA7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLW9wYWNpdHk6MTtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLWRhc2hvZmZzZXQ6MDttYXJrZXI6bm9uZTt2aXNpYmlsaXR5OnZpc2libGU7ZGlzcGxheTppbmxpbmU7b3ZlcmZsb3c6dmlzaWJsZTtlbmFibGUtYmFja2dyb3VuZDphY2N1bXVsYXRlIj48L3BhdGg+PC9nPjwvc3ZnPjwvZz48L2c+PC9zdmc+",
                                      iconSize:   [48, 48],
                                      iconAnchor: [24, 24],
                                      className:  "cq-marker-state"
                                  })}/> :
             null}
        </Fragment>
    }
}

class MapScreen extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {markers: []};
        db.markers.toArray().then(markers => this.setState({markers}));
    }

    generateSql() {
        let sqlMap = {
            launceston_rubbish_bins: `select cartodb_id, the_geom, the_geom_webmercator, 'hello' as name, 'rubbish_bins' as type from launceston_rubbish_bins`,
            launceston_public_seating: `select cartodb_id, the_geom, the_geom_webmercator, 'hello' as name, 'public_seating' as type from launceston_public_seating`,
            launceston_playground_equipment: `select cartodb_id, the_geom, the_geom_webmercator, 'hello' as name, 'playground_equipment' as type from launceston_playground_equipment`,
            launceston_parking_meters: `select cartodb_id, the_geom, the_geom_webmercator, 'hello' as name, 'parking_meters' as type from launceston_parking_meters`,
            heritage_places: `select cartodb_id, the_geom, the_geom_webmercator, 'hello' as name, 'heritage_places' as type from heritage_places`,
            medicalfacility: `select cartodb_id, the_geom, the_geom_webmercator, 'hello' as name, 'medical' as type from medicalfacility`,
            ohst_clinic_addresses: `select cartodb_id, the_geom, the_geom_webmercator, 'hello' as name, 'medical' as type from ohst_clinic_addresses`,
            nsw_public_schools: `select cartodb_id, the_geom, the_geom_webmercator, 'hello' as name, 'education' as type from nsw_public_schools`,
            nsw_early_childhood_education_and_care_provider_locations: `select cartodb_id, the_geom, the_geom_webmercator, 'hello' as name, 'education' as type from nsw_early_childhood_education_and_care_provider_locations`,


            nsw_university_locations: `select cartodb_id, the_geom, the_geom_webmercator, university_campus_name as name, 'university' as type from nsw_university_locations`,
            national_toliet_map: `select cartodb_id, the_geom, the_geom_webmercator, name as name, 'toilet' as type from national_toliet_map`,
        };

        return Object.keys(sqlMap).map(k => sqlMap[k]).join('\nUNION\n');
    }

    updateSql () {
        this.setState({mapSql: this.generateSql()})
    }

    componentWillMount() {
        this.updateSql();
    }

    render() {
        const position        = [-24, 132];
        const onLocationFound = ({latlng}) => {
            const {lat, lng} = latlng;
            // noinspection JSUnresolvedFunction
            this.props.onLocationFound(JSON.stringify({lat, lng}));
        };
        return (
            <div className="cq-map">
                <Map center={position} zoom={3} zoomControl={false} onLocationFound={onLocationFound}>
                    {this.state.mapSql && <CartoControl
                        css={`#layer {
                          marker-width: 25;
                          marker-height: 25;
                          marker-file: url(https://app.crowdquests.com/images/ShieldOnly.png)
                        }`}
                        sql={this.state.mapSql}
                        username={'jxeeno'}
                    />}
                    <LayersControl position="topright">
                        <LayersControl.BaseLayer name="Carto Voyager" checked={true}>
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png"
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="OpenStreetMap.BlackAndWhite">
                            <TileLayer
                                attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
                                url="https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png"
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="OpenStreetMap.Mapnik">
                            <TileLayer
                                attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                        </LayersControl.BaseLayer>
                    </LayersControl>
                    <LocateControl options={{
                        position:        "topright",
                        strings:         {
                            title: "Show me where I am, yo!"
                        },
                        locateOptions:   {
                            maxZoom: 16
                        },
                        onLocationError: (err, control) => {
                            console.error(err.message);
                            alert("Sorry, we don't know where you are.\nLet's play pretend!");
                            control._active = true;
                            control._onLocationFound({
                                                         latlng:   L.latLng(-41.432786, 147.143400),
                                                         accuracy: 2000,
                                                         bounds:   L.latLngBounds(L.latLng(-41.422786, 147.133400),
                                                                                  L.latLng(-41.442786, 147.153400))
                                                     });
                            control._active = false;
                        }
                    }} startDirectly/>
                    <ZoomControl position="bottomright"/>
                    <ScaleControl/>
                    {this.state.markers.map(marker => <MapMarker key={marker.id} {...marker}/>)}
                </Map>
                <div className="cq-navicons cq-footer">
                    <Link to="/capture" className="cq-navicon" data-enabled={!!this.props.latlng}>
                        <img className="cq-navicon-icon" src="/images/Capture-white.svg" alt="Capture"/><br/>
                        Capture
                    </Link>
                    <Link to="/quests" className="cq-navicon">
                        <img className="cq-navicon-icon" src="/images/Quest-white.svg" alt="Quests"/><br/>
                        Quests
                    </Link>
                    <Link to="/leaders" className="cq-navicon">
                        <img className="cq-navicon-icon" src="/images/Trophy-white.svg" alt="Leaderboard"/><br/>
                        Leaderboard
                    </Link>
                    <Link to="/mystash" className="cq-navicon">
                        <img className="cq-navicon-icon" src="/images/Gem-white.svg" alt="My Stash"/><br/>
                        My Stash
                    </Link>
                </div>
            </div>
        );
    }
}

class CaptureScreen extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        const onClick = () => {
            const canvas  = document.createElement("canvas");
            canvas.width  = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            canvas.getContext("2d").drawImage(this.video, 0, 0, canvas.width, canvas.height);
            // noinspection JSUnresolvedFunction
            this.props.onPhotoURL(canvas.toDataURL());
        };

        return (
            <div className="cq-capture">
                <video ref={element => element && (this.video = element)}
                       className="cq-video"
                       autoPlay
                       playsInline={true}/>
                <div className="cq-navicons cq-footer">
                    <Link to="/map" className="cq-navicon">Cancel</Link>
                    <Link to="/preview" className="cq-navicon" onClick={onClick} data-enabled={!!this.state.stream}>
                        Take Photo
                    </Link>
                </div>
            </div>
        );
    }

    componentDidMount() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const constraints = {
                advanced: [{
                    facingMode: "environment"
                }]
            };
            // Not adding `{ audio: true }` since we only want video now
            navigator.mediaDevices.getUserMedia({video: constraints}).then((stream) => {
                this.video.srcObject = stream;
                this.video.play();
                this.setState({stream});
            });
        }
    }

    componentWillUnmount() {
        this.video.srcObject.getTracks().forEach(track => track.stop());
    }
}

class PreviewScreen extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {stopTime: 0};
    }


    render() {
        const stopListening = () => {
            this.audio.pause();
            this.audio = null;
        };
        const onRecordStart = () => {
            // check time to prevent chrome android from doing touchend>mousedown
            if (this.state.recorder.state === "inactive" && this.state.stopTime + 300 < Date.now()) {
                this.state.recorder.start();
                this.setState({startTime: Date.now(), stopTime: 0});
                if (this.audio && this.state.playing) {
                    stopListening();
                }
            }
        };
        const onRecordStop  = () => {
            // check time to allow for both tap-to-start and push-to-talk
            if (this.state.recorder.state === "recording" && this.state.startTime + 300 < Date.now()) {
                this.state.recorder.stop();
                this.setState({startTime: 0, stopTime: Date.now()});
            }
        };
        const onPlay        = () => {
            if (!this.audio || !this.state.playing) {
                this.audio = new Audio(this.state.audioURL);
                this.audio.addEventListener("ended", () => this.setState({playing: false}));
                this.audio.addEventListener("pause", () => this.setState({playing: false}));
                this.audio.play();
                this.setState({playing: true});
            } else {
                stopListening();
            }
        };
        // noinspection JSUnresolvedFunction
        const onClick       = () => this.props.onAudioURL(this.state.audioURL);

        return (
            <div className="cq-preview">
                <img src={this.props.photoURL} alt="Preview" className="cq-preview-img"/>
                <div className="cq-edit-actions">
                    <div className="cq-edit-action"
                         data-enabled={!!this.state.recorder}
                         onMouseDown={onRecordStart} onTouchStart={onRecordStart}
                         onMouseUp={onRecordStop} onTouchEnd={onRecordStop}>
                        {this.state.startTime ? "Stop" : "Record"}
                    </div>
                    <div className="cq-edit-action"
                         data-enabled={!!this.state.audioURL && !this.state.startTime}
                         onClick={onPlay}>
                        {this.state.playing ? "Stop" : "Listen"}
                    </div>
                </div>
                <div className="cq-navicons cq-footer">
                    <Link to="/capture" className="cq-navicon">Retake</Link>
                    <Link to="/submit" className="cq-navicon" data-enabled={!!this.state.audioURL} onClick={onClick}>
                        Looks ok
                    </Link>
                </div>
            </div>
        );
    }

    componentDidMount() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
                // noinspection JSUnresolvedFunction
                const recorder = new MediaRecorder(stream);
                this.setState({recorder});
                recorder.addEventListener("dataavailable", event => {
                    const reader = new FileReader();
                    reader.addEventListener("load", () => this.setState({audioURL: reader.result}));
                    reader.readAsDataURL(event.data);
                });
            });
        }
    }

    componentWillUnmount() {
        this.state.recorder.stream.getTracks().forEach(track => track.stop());
    }
}

class SubmitScreen extends PureComponent {
    constructor(props) {
        super(props);
        this.state          = {percentSubmitted: -1};
        this.points         = Math.round(50 + Math.random() * 50);
        localStorage.points = Number(localStorage.points) + this.points;
    }

    render() {
        if (this.state.isSignedIn && this.state.percentSubmitted < 0) {
            const {latlng, photoURL, audioURL} = this.props;
            db.markers.add({latlng, photoURL, audioURL}).then(() => sessionStorage.clear());

            const update = () => setTimeout(() => {
                const percentSubmitted = this.state.percentSubmitted + 1;
                this.setState({percentSubmitted});
                if (percentSubmitted < 100) {
                    update();
                }
            }, Math.random() * 100);
            update();
        }

        return (
            this.state.percentSubmitted < 100 ?
            this.state.isSignedIn ?
            <div className="cq-submit">{this.state.percentSubmitted}% submitted...</div> :
            <div className="cq-login">
                <LoginButton onIsSignedIn={isSignedIn => this.setState({isSignedIn})}/>
            </div> :
            <div className="cq-submit">
                +{this.points}<br/>Total {localStorage.points} points!<br/>
                <div className="cq-points-update">AWESOME</div>
                <Link to="/map" className="cq-button">Thank you!</Link>
            </div>
        );
    }
}

class QuestService {
    constructor() {
        this.quests = [
            {
                name:        "Keeping healthy",
                description: "Check-in at 10 nearby health facilities and earn 1000 points!",
                faIconClass: "fa-hospital",
                goals:       [
                    {
                        description:  "Check-in at 5 health facilities",
                        datasets:     ["medicalfacility"],
                        progress:     0.2,
                        requirements: {
                            checkin: 5
                        },
                        completed:    {
                            checkin: 2
                        },
                        rewards:      {
                            points: 1000
                        }
                    },
                    {
                        description:  "Find 5 locations with fitness equipment",
                        datasets:     ["fitness"],
                        progress:     0.8,
                        requirements: {
                            checkin: 5
                        },
                        completed:    {
                            checkin: 4
                        },
                        rewards:      {
                            points: 1000
                        }
                    }
                ]
            },
            {
                name:        "Trash Explorer",
                description: "Find 5 rubbish or recycling bins nearby and call it a day!",
                faIconClass: "fa-trash",
                goals:       [
                    {
                        description:  "Visit 5 trash cans",
                        datasets:     ["trash"],
                        requirements: {
                            checkin: 5
                        },
                        completed:    {
                            checkin: 2
                        },
                        rewards:      {
                            points: 1000
                        }
                    }
                ]
            }
        ]
    }

    getQuest(i) {
        return this.quests[i];
    }

    getQuests() {
        return this.quests;
    }
}

class QuestListScreen extends PureComponent {
    constructor(props) {
        super(props);

        this.questService = new QuestService();
        this.state        = {
            quests: this.questService.getQuests()
        };
    }

    render() {
        return <div style={{height: 'calc(100%  - 48px)', background: '#efeae4'}}>
            <div style={{margin: 'auto', maxWidth: '500px'}}>
                <h2>Quests</h2>
                Choose from these following Quests! As you gain points and we get to know you, you'll get new quests to choose from
                {
                    this.state.quests.map((quest, i) =>
                                              <Link to={"/quest/" + i} style={{
                                                  padding:      5,
                                                  marginTop:    5,
                                                  marginBottom: 5,
                                                  display:      'flex',
                                                  borderRadius: 5,
                                                  background:   'white',
                                                  border:       '1px solid black'
                                              }} key={i}>
                                                  <div>
                                                      <div style={{
                                                          borderRadius: '50%',
                                                          height:       60,
                                                          width:        60,
                                                          background:   '#777',
                                                          color:        'red'
                                                      }}>
                                                          {/*<i className={"fa " + quest.faIconClass}></i>*/}
                                                      </div>
                                                  </div>
                                                  <div style={{
                                                      flex:           1,
                                                      marginLeft:     10,
                                                      flexDirection:  'column',
                                                      display:        'flex',
                                                      justifyContent: 'center'
                                                  }}>
                                                      <div className="cq-quest-name"
                                                           style={{color: 'black', fontWeight: 'bold'}}>{quest.name}</div>
                                                      <div className="cq-quest-desc"
                                                           style={{fontSize: '89%', color: '#777'}}>{quest.description}</div>
                                                  </div>
                                              </Link>
                    )
                }
            </div>
            <div className="cq-navicons cq-footer">
                <Link to="/capture" className="cq-navicon">
                    <img className="cq-navicon-icon" src="/images/Capture-white.svg" alt="Capture"/><br/>
                    Capture
                </Link>
                <Link to="/quests" className="cq-navicon" data-active={true}>
                    <img className="cq-navicon-icon" src="/images/Quest-white.svg" alt="Quests"/><br/>
                    Quests
                </Link>
                <Link to="/leaders" className="cq-navicon">
                    <img className="cq-navicon-icon" src="/images/Trophy-white.svg" alt="Leaderboard"/><br/>
                    Leaderboard
                </Link>
                <Link to="/mystash" className="cq-navicon">
                    <img className="cq-navicon-icon" src="/images/Gem-white.svg" alt="My Stash"/><br/>
                    My Stash
                </Link>
            </div>
        </div>
    }
}

class QuestScreen extends PureComponent {
    constructor(props) {
        super(props);

        this.questService = new QuestService();
        this.state        = {
            quest: this.questService.getQuest(props.match.params.id)
        };
    }

    render() {
        return <div>
            <div style={{margin: 'auto', maxWidth: '500px'}}>
                <div>
                    <h2>{this.state.quest.name}</h2>
                    <div className="cq-quest-desc">{this.state.quest.description}</div>
                </div>
                {this.state.quest.goals.map((goal, i) => <div to={"/quest/" + i} style={{
                    padding:      5,
                    marginTop:    5,
                    marginBottom: 5,
                    display:      'flex',
                    borderRadius: 5,
                    background:   'white',
                    border:       '1px solid black'
                }} key={i}>
                    <div style={{
                        flex:           1,
                        marginRight:    10,
                        marginLeft:     10,
                        flexDirection:  'column',
                        display:        'flex',
                        justifyContent: 'center'
                    }}>
                        <div className="cq-quest-name" style={{color: 'black', fontWeight: 'bold'}}>{goal.description}</div>
                        <div className="cq-progress">
                            <div className="cq-progress-bar" style={{width: (goal.progress * 100) + '%'}}></div>
                        </div>
                    </div>
                    <div>
                        <div style={{borderRadius: '50%', height: 60, width: 60, background: '#777', color: 'red'}}>

                        </div>
                    </div>
                </div>)}

                <div style={{display: 'flex', marginTop: 15, paddingTop: 15, borderTop: '1px solid #eee'}}>
                    <Link to="/map" className="cq-button">Play ▶</Link>
                </div>
            </div>
            <div className="cq-navicons cq-footer">
                <Link to="/capture" className="cq-navicon">
                    <img className="cq-navicon-icon" src="/images/Capture-white.svg" alt="Capture"/><br/>
                    Capture
                </Link>
                <Link to="/quests" className="cq-navicon" data-active={true}>
                    <img className="cq-navicon-icon" src="/images/Quest-white.svg" alt="Quests"/><br/>
                    Quests
                </Link>
                <Link to="/leaders" className="cq-navicon">
                    <img className="cq-navicon-icon" src="/images/Trophy-white.svg" alt="Leaderboard"/><br/>
                    Leaderboard
                </Link>
                <Link to="/mystash" className="cq-navicon">
                    <img className="cq-navicon-icon" src="/images/Gem-white.svg" alt="My Stash"/><br/>
                    My Stash
                </Link>
            </div>
        </div>
    }
}

// requires third-party cookies to be allowed
class LoginButton extends PureComponent {
    render() {
        return (
            <div id="g-signin2"/>
        );
    }

    componentDidMount() {
        const interval = setInterval(() => {
            if (window.gapi) {
                // noinspection JSUnresolvedVariable
                const auth2 = window.gapi.auth2;
                if (auth2) {
                    // noinspection JSUnresolvedFunction
                    const isSignedIn = auth2.getAuthInstance().isSignedIn;
                    // noinspection JSUnresolvedFunction
                    this.props.onIsSignedIn(isSignedIn.get());
                    // noinspection JSUnresolvedFunction
                    isSignedIn.listen(isSignedIn => this.props.onIsSignedIn(isSignedIn));
                    clearInterval(interval);
                }
                if (window.gapi.signin2) {
                    window.gapi.signin2.render("g-signin2", {
                        onfailure: console.error
                    });
                }
            }
        }, 100);
    }
}

class RandomUser extends PureComponent {
    render() {
        return <tr className="cq-user-row" data-active={!!this.props.me}>
            <td><b>{this.props.rank}</b></td>
            <td><img src={this.props.user.picture.large} alt={this.props.user.login.username} className="cq-user-thumbnail"/></td>
            <td>{this.props.user.login.username}</td>
            <td>{this.props.points}</td>
            {/*<td>{JSON.stringify(this.props.user)}</td>*/}
        </tr>;
    }
}

class LeadersScreen extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {};
        fetch("https://randomuser.me/api/?results=99")
            .then(response => response.json())
            .then(response => this.setState({response}));
    }

    render() {
        let points    = localStorage.points;
        const profile = this.state.isSignedIn && window.gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();

        return <div className="cq-leaders">
            <div className="cq-leaders-list">
                <img src="/images/ShieldOnly.png" alt="Logo" height={96}/><br/>
                <b>Leaderboard</b>
                <table align="center">
                    <tr>
                        <td colSpan={4}>
                            <div className="cq-navicons">
                                <div className="cq-button"
                                     data-active={!this.state.allTime}
                                     onClick={() => this.setState({allTime: false})}>
                                    This Week
                                </div>
                                <div className="cq-button"
                                     data-active={!!this.state.allTime}
                                     onClick={() => this.setState({allTime: true})}>
                                    All time
                                </div>
                            </div>
                        </td>
                    </tr>
                    {this.state.isSignedIn ?
                     <RandomUser rank={1}
                                 user={{
                                     picture: {large: profile.getImageUrl()},
                                     login:   {username: profile.getEmail()}
                                 }}
                                 points={points}
                                 me={true}/> :
                     <tr>
                         <td colSpan={4}><LoginButton onIsSignedIn={isSignedIn => this.setState({isSignedIn})}/></td>
                     </tr>}
                    {this.state.response &&
                     this.state.response.results.map((user, u) =>
                                                         <RandomUser rank={u + 2}
                                                                     user={user}
                                                                     key={u}
                                                                     points={points -= Math.round(points * Math.random() / 10)}/>)}
                </table>
            </div>
            <div className="cq-navicons cq-footer">
                <Link to="/map" className="cq-navicon">
                    <img className="cq-navicon-icon" src="/images/Map-white.svg" alt="Quests"/><br/>
                    Map
                </Link>
                <Link to="/quests" className="cq-navicon">
                    <img className="cq-navicon-icon" src="/images/Quest-white.svg" alt="Quests"/><br/>
                    Quests
                </Link>
                <Link to="/leaders" className="cq-navicon" data-active="true">
                    <img className="cq-navicon-icon" src="/images/Trophy-white.svg" alt="Leaderboard"/><br/>
                    Leaderboard
                </Link>
                <Link to="/mystash" className="cq-navicon">
                    <img className="cq-navicon-icon" src="/images/Gem-white.svg" alt="My Stash"/><br/>
                    My Stash
                </Link>
            </div>
        </div>;
    }
}

class MyStashScreen extends PureComponent {
    render() {
        return (
            <div className="cq-my-stash">
                <div className="cq-my-stash-content">
                    <div className="cq-description">
                        CrowdQuests was developed for GovHack 2018 by the team Happy Goats. Team members are Ken Tsang, Jayen Ashar,
                        Richard Tubb and Yvonne Lee with a help from John Stericker. Contact us at govhack@crowdquests.com
                    </div>
                    <div className="cq-team"/>
                </div>
                <div className="cq-navicons cq-footer">
                    <Link to="/map" className="cq-navicon">
                        <img className="cq-navicon-icon" src="/images/Map-white.svg" alt="Quests"/><br/>
                        Map
                    </Link>
                    <Link to="/quests" className="cq-navicon">
                        <img className="cq-navicon-icon" src="/images/Quest-white.svg" alt="Quests"/><br/>
                        Quests
                    </Link>
                    <Link to="/leaders" className="cq-navicon">
                        <img className="cq-navicon-icon" src="/images/Trophy-white.svg" alt="Leaderboard"/><br/>
                        Leaderboard
                    </Link>
                    <Link to="/mystash" className="cq-navicon" data-active="true">
                        <img className="cq-navicon-icon" src="/images/Gem-white.svg" alt="My Stash"/><br/>
                        My Stash
                    </Link>
                </div>
            </div>
        );
    }
}

class App extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            photoURL: sessionStorage.photoURL,
            audioURL: sessionStorage.audioURL,
            latlng:   sessionStorage.latlng,
        };
    }

    render() {
        const onPhotoURL      = photoURL => this.setState({photoURL: sessionStorage.photoURL = photoURL});
        const onAudioURL      = audioURL => this.setState({audioURL: sessionStorage.audioURL = audioURL});
        const onLocationFound = latlng => this.setState({latlng: sessionStorage.latlng = latlng});

        const {latlng, photoURL, audioURL} = this.state;

        return (
            <Router>
                <Switch>
                    <Route exact path="/map" render={props =>
                        <MapScreen {...props} onLocationFound={onLocationFound} latlng={latlng}/>}/>
                    <Route exact path="/capture" render={(props) => latlng ?
                                                                    <CaptureScreen {...props} onPhotoURL={onPhotoURL}/> :
                                                                    <Redirect push to="/map"/>}/>
                    <Route exact path="/preview" render={(props) => latlng && photoURL ?
                                                                    <PreviewScreen {...props} photoURL={photoURL}
                                                                                   onAudioURL={onAudioURL}/> :
                                                                    <Redirect push to="/capture"/>}/>
                    <Route exact path="/submit" render={(props) => latlng && photoURL && audioURL ?
                                                                   <SubmitScreen {...props} latlng={latlng} photoURL={photoURL}
                                                                                 audioURL={audioURL}/> :
                                                                   <Redirect push to="/preview"/>}/>
                    <Route exact path="/leaders" component={LeadersScreen}/>
                    <Route exact path="/mystash" component={MyStashScreen}/>
                    <Route exact path="/quests" render={(props) => <QuestListScreen {...props} latlng={latlng} photoURL={photoURL}
                                                                                    audioURL={audioURL}/>}/>
                    <Route exact path="/quest/:id"
                           render={(props) => <QuestScreen {...props} latlng={latlng} photoURL={photoURL} audioURL={audioURL}/>}/>
                    <Route component={StartScreen}/>
                </Switch>
            </Router>
        );
    }
}

export default App;
