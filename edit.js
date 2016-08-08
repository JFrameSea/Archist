requirejs(['../config'], function () {
    require(['jquery', 'qiniu', 'editor', 'util', 'underscore', 'swiper', 'moment', 'bootstrap', 'bootstrap.notify', 'validate', 'jquery.dotdotdot'], function ($, Qiniu, Editor, util, _, moment) {
        $.notifyDefaults({
            type: 'danger',
            delay: 4000
        });

        var isChange = false;

        function saveMedia(data, callback) {
            $.ajax({
                url: '/service/product/save-media',
                type: 'POST',
                data: data
            }).done(function (response) {
                callback && callback(response);
            });
        }

        function initOptions() {
            var optionsContainer = $('#options-container'),
                addOptionLink = $('#link-add-option'),
                optionDialog = $('#option-set'),
                dateSelect = $('.date-select'),
                optionTable = optionDialog.find('table'),
                productId = $('#product-id').val(),
                optionRowTemplate = _.template($('#option-row-tmpl').html()),
                optionDetailTemplate = _.template($('#option-detail-tmpl').html()),
                pricesSettingElem = $('#product_selling_row');

            function getMaxIndex() {
                var indexes = [],
                    maxIndex = 0;
                $.each(optionTable.find('.option-row'), function () {
                    var index = $(this).data('index');
                    maxIndex = index > maxIndex ? index : maxIndex;
                });

                return maxIndex;
            }

            $('.show-option').click(function() {
                optionsContainer.toggleClass('d-none');
                pricesSettingElem.toggleClass('expanded', !optionsContainer.hasClass('d-none'));
            });

            optionDialog.on('click', '.btn-add-option', function () {
                var maxIndex = getMaxIndex();
                var maxCount = $('#option-form').data('count');
                var optionCount = optionTable.find('.option-row').size();
                if (optionCount == maxCount) {
                    $.notify('最多可添加' + maxCount + '条选项', {type: 'info'});
                    return false;
                }
                optionTable.find('tbody').append(optionRowTemplate({
                    startIndex: maxIndex + 1,
                    options: [{
                        max_qty_per_user: 1,
                        is_selling: false
                    }]
                }));
                isChange = true;
                initPopover(maxIndex + 1);
            });

            optionTable.on('click', '.option-delete', function() {
                $(this).closest('tr').remove();
                isChange = true;
            });
        }

        function initEditor() {
            var productContentContainer = $('#product-content'),
                sortContainer = $('#sortitem-container'),
                form = $('#edit-form'),
                productId = $('#product-id').val();

            var editor = Editor.init({
                sortableContainer: sortContainer,
                blockContainer: productContentContainer
            });

            var containerUploader = Qiniu.uploader({
                runtimes: 'html5,flash,html4',
                browse_button: 'drag-button',
                container: 'project-draggable-container',
                dragdrop: true,
                drop_element: 'drop-container',
                max_file_size: '10mb',
                flash_swf_url: 'libs/plupload/Moxie.swf',
                chunk_size: '4mb',
                uptoken_url: '/service/cdn/uptoken',
                domain: APP_CONFIG.cdn.domain,
                get_new_uptoken: true,
                unique_names: true,
                auto_start: false,
                multi_selection: false,
                filters: {
                    mime_types: [
                        {
                            title : 'Image Video files',
                            extensions : 'jpg,jpeg,gif,png,mp4,ogg'
                        }
                    ]
                },
                init: {
                    FilesAdded: function (up, files) {
                        $.each(files, function (index, file) {
                            var type = file.type.split('/')[0];
                            if (type === 'video') {
                                util.getAudioDuration(file.getNative(), function (data) {
                                    if (data && data.duration > 10) {
                                        up.removeFile(file);
                                        $.notify('视频超过10秒');
                                    } else {
                                        up.start();
                                    }
                                });
                            } else if (type === 'image') {
                                up.start();
                            }
                        });
                    },
                    FileUploaded: function (up, file, info) {
                        var domain = up.getOption('domain'),
                            result = $.parseJSON(info),
                            sourceLink = 'http://' + domain + '/' + result.key,
                            type = file.type.split('/')[0],
                            blockId;

                        if (type === 'image') {
                            blockId = editor.addBlock({
                                type: Editor.BLOCK_TYPE_IMAGE,
                                src: result.key,
                                caption: ''
                            });

                            saveMedia({
                                type: 'image',
                                path: result.key,
                                product_id: productId
                            }, function (response) {
                                if (response.status === 'SUCCESS') {
                                    editor.updateBlock(blockId, {
                                        mediaId: response.body.media_id
                                    });
                                    isChange = true;
                                }
                            });
                        } else if (type === 'video') {
                            blockId = editor.addBlock({
                                type: Editor.BLOCK_TYPE_VIDEO,
                                src: result.key,
                                caption: ''
                            });

                            saveMedia({
                                type: 'video',
                                path: result.key,
                                product_id: productId
                            }, function (response) {
                                if (response.status === 'SUCCESS') {
                                    editor.updateBlock(blockId, {
                                        mediaId: response.body.media_id
                                    });
                                    isChange = true;
                                }
                            });
                        }
                    },
                    Error: function (up, err, errTip) {
                        $.notify(errTip);
                    }
                }
            });

            var imageUploader = Qiniu.uploader({
                runtimes: 'html5,flash,html4',
                browse_button: 'image-button',
                container: 'project-draggable-container',
                max_file_size: '10mb',
                flash_swf_url: 'libs/plupload/Moxie.swf',
                chunk_size: '4mb',
                drop_element: false,
                uptoken_url: '/service/cdn/uptoken',
                domain: APP_CONFIG.cdn.domain,
                get_new_uptoken: true,
                unique_names: true,
                auto_start: true,
                multi_selection: false,
                filters: {
                    mime_types: [
                        {
                            title : 'Image files',
                            extensions : 'jpg,jpeg,gif,png'
                        }
                    ]
                },
                init: {
                    FileUploaded: function (up, file, info) {
                        var domain = up.getOption('domain'),
                            result = $.parseJSON(info),
                            sourceLink = 'http://' + domain + '/' + result.key,
                            blockId;

                        blockId = editor.addBlock({
                            type: Editor.BLOCK_TYPE_IMAGE,
                            src: result.key,
                            caption: ''
                        });

                        saveMedia({
                            type: 'image',
                            path: result.key,
                            product_id: productId
                        }, function (response) {
                            if (response.status === 'SUCCESS') {
                                editor.updateBlock(blockId, {
                                    mediaId: response.body.media_id
                                });
                                isChange = true;
                            }
                        });
                    },
                    Error: function (up, err, errTip) {
                        $.notify(errTip);
                    }
                }
            });

            var heroUploader = Qiniu.uploader({
                runtimes: 'html5,flash,html4',
                browse_button: 'project-hero-text',
                max_file_size: '10mb',
                flash_swf_url: 'libs/plupload/Moxie.swf',
                container: 'project-hero-container',
                dragdrop: true,
                drop_element: 'project-hero-container',
                chunk_size: '4mb',
                uptoken_url: '/service/cdn/uptoken',
                domain: APP_CONFIG.cdn.domain,
                get_new_uptoken: true,
                unique_names: true,
                auto_start: true,
                multi_selection: false,
                filters: {
                    mime_types: [
                        {
                            title : 'Image files',
                            extensions : 'jpg,jpeg,gif,png'
                        }
                    ]
                },
                init: {
                    FileUploaded: function (up, file, info) {
                        var domain = up.getOption('domain'),
                            result = $.parseJSON(info),
                            sourceLink = util.getUrlByAliasName(result.key, 'product.hero.wm');

                        $('#project-hero').attr('src', sourceLink);
                        $('#project-hero').removeClass('hidden');
                        $('#project-hero-container').removeClass('no-hero');

                        saveMedia({
                            type: 'image',
                            path: result.key,
                            product_id: productId
                        }, function (response) {
                            if (response.status === 'SUCCESS') {
                                form.find('input[name=banner_media]').val(response.body.media_id);
                                isChange = true;
                            }
                        });
                    },
                    Error: function (up, err, errTip) {
                        $.notify(errTip);
                    }
                }
            });

            var videoUploader = Qiniu.uploader({
                runtimes: 'html5,flash,html4',
                browse_button: 'video-button',
                container: 'project-draggable-container',
                max_file_size: '10mb',
                flash_swf_url: 'libs/plupload/Moxie.swf',
                dragdrop: false,
                drop_element: false,
                chunk_size: '4mb',
                uptoken_url: '/service/cdn/uptoken',
                domain: APP_CONFIG.cdn.domain,
                get_new_uptoken: true,
                unique_names: true,
                auto_start: false,
                multi_selection: false,
                filters: {
                    mime_types: [
                        {
                            title : 'Video files',
                            extensions : 'mp4,ogg'
                        }
                    ]
                },
                init: {
                    FilesAdded: function (up, files) {
                        $.each(files, function (index, file) {
                            util.getAudioDuration(file.getNative(), function (data) {
                                if (data && data.duration > 10) {
                                    up.removeFile(file);
                                    $.notify('视频超过10秒');
                                } else {
                                    up.start();
                                }
                            });
                        });
                    },
                    FileUploaded: function (up, file, info) {
                        var domain = up.getOption('domain'),
                            result = $.parseJSON(info),
                            sourceLink = 'http://' + domain + '/' + result.key,
                            blockId;

                        blockId = editor.addBlock({
                            type: Editor.BLOCK_TYPE_VIDEO,
                            src: result.key,
                            caption: ''
                        });

                        saveMedia({
                            type: 'video',
                            path: result.key,
                            product_id: productId
                        }, function (response) {
                            if (response.status === 'SUCCESS') {
                                editor.updateBlock(blockId, {
                                    mediaId: response.body.media_id
                                });
                                isChange = true;
                            }
                        });
                    },
                    Error: function (up, err, errTip) {
                        $.notify(errTip);
                    }
                }
            });

            /*click the embeds button to add embed*/
            $('#commit-embeds').click(function() {
                var embedsValue = $.trim($('#embeds-input').val());
                if (embedsValue != '') {
                    editor.addBlock({
                        type: 'embed',
                        code: embedsValue
                    });
                };
                $('#embDialog').modal('hide');
                isChange = true;
            });

            /*click the text button to add text editor*/
            $('#text-button').click(function() {
                editor.addBlock({
                    type: 'text'
                });
                isChange = true;
            });

            if (!$('#product-id').val()) {
                editor.addBlock({
                    type: 'text'
                });
            }

            /*click this button to add related product*/
            var swiper;
            $('#relate-button').click(function() {
                $('#related-dialog').modal('show');
                $('#other-product').show();
                $('#all-images').hide();
                $('#next-step').show();
                $('#commit-related').hide();
                $('#related-title').text('添加相关家藏');
                swiper = new Swiper('.swiper-container', {
                    nextButton: '.swiper-button-next',
                    prevButton: '.swiper-button-prev',
                    slidesPerView: 3,
                    paginationClickable: true,
                    spaceBetween: 5,
                    keyboardControl: true,
                });
            });

            $('#next-step').click(function() {
                var productId = $(window.frames['products_iframe'].document).find('input[name="product"]:checked').val();
                if (typeof(productId) !== 'undefined') {
                    $.ajax({
                        url: '/service/product/all-images',
                        type: 'GET',
                        dataType: 'JSON',
                        data: {'productId': productId}
                    }).done(function(response) {
                        if (response.status === 'SUCCESS') {
                            var bannerMedia = response.body.bannerMedia;
                            var hero = response.body.hero;
                            var images = response.body.images;
                            var imageCount = response.body.imageCount;
                            imagesTemplate = _.template($('#product-imgs').html());
                            var imagesTemplateHtml = imagesTemplate({
                                bannerMedia: bannerMedia,
                                hero: hero,
                                images: images
                            });
                            $('#other-product').hide();
                            $('#related-title').text('设置预览图（建议尺寸 1000＊490）');
                            $('#cover-img').attr('src', hero['cdn_path'] ? hero['cdn_path'] : '/static/image/cover_image_1400x682.png');
                            $('#cover-img').data('img-id', hero['media_id']);
                            $('.swiper-wrapper').html(imagesTemplateHtml);
                            if (imageCount == 0) {
                                $('#swiper-wrapper').hide();
                            } else {
                                $('#swiper-wrapper').show();
                            }
                            $('#all-images').show();
                            swiper.update(true);
                            swiper.slideTo($('.img-selected').closest('.swiper-slide').index());
                            $('#next-step').hide();
                            $('#commit-related').show();
                            $('#related-dialog').find('.modal-dialog').css({
                                'margin-top': function() {
                                    return - ($(this).height() / 2);
                                }
                            });
                        } else if (response.status == 'FAILED') {
                            $.notify(response.body.error);
                        } else {
                            $.notify('系统错误，请稍后再试');
                        }
                    });
                }
            });

            $('#related-dialog').on('hidden.bs.modal', function (e) {
                swiper.destroy(true, true);
            })

            $('.swiper-wrapper').on('click', '.small-hero', function() {
                $('.small-hero').removeClass('img-selected');
                $(this).addClass('img-selected');
                $('#cover-img').attr('src', $(this).data('img-src'));
                $('#cover-img').data('img-id', $(this).data('img-id'));
            });

            //get related product_id and add related product
            $('#commit-related').click(function () {
                var productId = $(window.frames['products_iframe'].document).find('input[name="product"]:checked').val();
                if (typeof(productId) !== 'undefined') {
                    var imageId = $('#cover-img').data('img-id');
                    $.ajax({
                        url: '/service/product/detail',
                        type: 'GET',
                        dataType: 'JSON',
                        data: {
                            'productId': productId,
                            'imageId': imageId
                        }
                    }).done(function(response) {
                        if (response.status === 'SUCCESS') {
                            var product = response.body.productDetail;
                            blockId = editor.addBlock({
                                type: Editor.BLOCK_TYPE_PRODUCT,
                                relatedId: product['product_id'],
                                src: product['cdn_path'],
                                name: product['name'],
                                description: product['short_description'],
                                username: product['nickname'],
                                location: product['city'],
                                showUrl: product['show_url'],
                                imageId: imageId
                            });
                            isChange = true;
                        } else if (response.status == 'FAILED') {
                            $.notify(response.body.error);
                        } else {
                            $.notify('系统错误，请稍后再试');
                        }
                    });
                }
                $('#related-dialog').modal('hide');
            });

            var saveProduct = function(action, obj) {
                window.onbeforeunload = null;
                var contentData = editor.getDataArray(),
                    data = form.serializeArray();

                data.push({
                    name: 'description',
                    value: JSON.stringify(contentData)
                });

                $.ajax({
                    url: '/service/product/save',
                    type: 'POST',
                    data: data,
                }).done(function (response) {
                    if (response.status === 'SUCCESS') {
                        if (action === 'publish') {
                            var productId = response.body.productId;
                            location.href = '/product/preview?product_id=' + productId;
                        } else {
                            location.href = '/user/' + $('#user-id').val();
                        }
                        isChange = false;
                    } else if (response.status == 'INVALID') {
                        $.notify('参数错误');
                        obj.data('status', 'working');
                    } else if (response.status == 'FAILED') {
                        $.notify(response.body.error);
                        obj.data('status', 'working');
                    } else {
                        $.notify('系统错误，请稍后再试');
                        obj.data('status', 'working');
                    }
                });
            }

            $('#publish-preview').click(function() {
                var currentObj = $(this);
                if (currentObj.data('status') === 'working') {
                    if (!$('#edit-form').valid()) {
                        return false;
                    }
                    currentObj.data('status', 'pending');
                    saveProduct('publish', currentObj);
                }
            });

            $('#save-draft').click(function() {
                var currentObj = $(this);
                if (currentObj.data('status') === 'working') {
                    if (!$('#edit-form').valid()) {
                        return false;
                    }
                    saveProduct('draft', currentObj);
                }
            });

            $('#edit-form').find('input[name=address]').change(function() {
                isChange = true;
            });
            $('#edit-form').find('input[name=title]').change(function() {
                isChange = true;
            });
            $('#edit-form').find('input[name=is_selling]').change(function() {
                isChange = true;
            });

            $('#publish-cancel').click(function() {
                location.href = '/user/' + $('#user-id').val();
            });

            $('#edit-form').validate({
                rules: {
                    title: {
                        required: true,
                        maxlength: 64
                    },
                    province: {
                        required: true
                    },
                    city: {
                        required: true
                    },
                    location_id: {
                        required: true
                    }
                }
            });

            $.validator.addClassRules({
                'option-price': {
                    required: true,
                    number: true,
                    positiveNumber: true
                },
                'option-holiday-price': {
                    number: true,
                    positiveNumber: true
                },
                'option-value': {
                    required: true,
                    maxlength: 200
                },
                'option-stock-qty': {
                    required: true,
                    positiveInteger: true
                },
                'option-max-qty-peruser': {
                    required: true,
                    positiveInteger: true
                }
            });
        }

        window.onbeforeunload = function(event) {
            if (Editor.IS_CHANGED) {
                isChange = true;
            }
            if (isChange) {
                event.returnValue = "有内容发生改变，是否确定取消发布？";
            }
        };

        function initLocations() {
            var provinceSelect = $('#province'),
                citySelect = $('#city'),
                districtSelect = $('#district'),
                locationTemplate;

            if (provinceSelect.length === 0) {
                return;
            }

            locationTemplate = _.template($('#location-tmpl').html());

            function updateProvince(data) {
                citySelect.html('<option value="">- 市 -</option>' + locationTemplate({
                    locations: data
                }));
                districtSelect.html('<option value="">- 区 -</option>');
            }

            function updateCity(data) {
                districtSelect.html('<option value="">- 区 -</option>' + locationTemplate({
                    locations: data
                }));
            }

            provinceSelect.on('change', function() {
                var locationId = $(this).val();
                if (locationId) {
                    util.getLocations(locationId, updateProvince);
                } else {
                    updateProvince([]);
                }
                isChange = true;
            });

            citySelect.on('change', function() {
                var locationId = $(this).val();

                if (locationId) {
                    util.getLocations(locationId, updateCity);
                } else {
                    updateCity([]);
                }
                isChange = true;
            });

            districtSelect.on('change', function() {
                isChange = true;
            });
        }

        function initMap() {
            var geocoder,
                form = $('#edit-form'),
                mapMarker = $('#map-marker'),
                getAddress = function () {
                    var province = $.trim($('#province').find(':selected').text()),
                        city = $.trim($('#city').find(':selected').text()),
                        district = $.trim($('#district').find(':selected').text()),
                        address = $.trim(form.find('input[name=address]').val());

                    return province + city + district + address;
                };

            if (mapMarker.length === 0) {
                return;
            }

            require(['async!qqmap'], function () {
                var mapContainer = $('#map-container'),
                    latitudeInput = $('#latitude'),
                    longitudeInput = $('#longitude'),
                    lat = latitudeInput.val(),
                    lng = longitudeInput.val(),
                    map = new qq.maps.Map(document.getElementById('map-container'),{
                        center: new qq.maps.LatLng(lat, lng),
                        zoom: 13
                    }),
                    marker,
                    info;

                geocoder = new qq.maps.Geocoder();
                geocoder.setComplete(function(result) {
                    var location = result.detail.location;
                    map.setCenter(location);
                    if (marker) {
                        marker.setMap(null);
                    }

                    marker = new qq.maps.Marker({
                        map: map,
                        animation: qq.maps.MarkerAnimation.DROP,
                        position: location
                    });

                    lat = location.getLat();
                    lng = location.getLng();
                    latitudeInput.val(lat);
                    longitudeInput.val(lng);
                });

                if (lat && lng) {
                    map = new qq.maps.Map(document.getElementById('map-container'),{
                        center: new qq.maps.LatLng(lat, lng),
                        zoom: 13
                    });
                    marker = new qq.maps.Marker({
                        map: map,
                        position: new qq.maps.LatLng(lat, lng),
                        animation: qq.maps.MarkerAnimation.DROP
                    });
                } else if ($('#province').val() != '' || $.trim(form.find('input[name=address]').val()) != '') {
                    geocoder.getLocation(getAddress());
                } else {
                    map = new qq.maps.Map(document.getElementById('map-container'),{
                        center: new qq.maps.LatLng(31.230416, 121.473701),
                        zoom: 13
                    });
                    marker = new qq.maps.Marker({
                        map: map,
                        position: new qq.maps.LatLng(31.230416, 121.473701),
                        animation: qq.maps.MarkerAnimation.DROP
                    });
                }

                qq.maps.event.addListener(map, 'click', function(event) {
                    var latLng = event.latLng;

                    if (marker) {
                        marker.setMap(null);
                    }

                    if (info) {
                        info.setMap(null);
                    }

                    marker = new qq.maps.Marker({
                        position: latLng,
                        animation: qq.maps.MarkerAnimation.DROP,
                        map: map
                    });
                    info = new qq.maps.InfoWindow({
                        map: map
                    });
                    info.open();
                    info.setContent('<div id="info-win">是否确定选择？<div><button id="cancle" type="button">取消</button><button id="commit" type="button">确定</button></div></div>');
                    info.setPosition(latLng);
                    mapContainer.on('click', '#commit', function() {
                        lat = latLng.getLat();
                        lng = latLng.getLng();
                        latitudeInput.val(lat);
                        longitudeInput.val(lng);
                        info.close();
                        mapContainer.hide();
                        isChange = true;
                    });
                    mapContainer.on('click', '#cancle', function() {
                        if (marker) {
                            marker.setMap(null);
                        }

                        marker = new qq.maps.Marker({
                            position: new qq.maps.LatLng(lat, lng),
                            animation: qq.maps.MarkerAnimation.DROP,
                            map: map
                        });
                        info.close();
                    });
                });

                mapMarker.click(function () {
                    if (marker) {
                        marker.setMap(null);
                    }
                    if (info) {
                        info.setMap(null);
                    }

                    if (lat && lng) {
                        marker = new qq.maps.Marker({
                            map: map,
                            position: new qq.maps.LatLng(lat, lng),
                            animation: qq.maps.MarkerAnimation.DROP
                        });
                    } else if ($('#province').val() != '' || $.trim(form.find('input[name=address]').val()) != '') {
                        geocoder.getLocation(getAddress());
                    } else {
                        marker = new qq.maps.Marker({
                            map: map,
                            position: new qq.maps.LatLng(31.230416, 121.473701),
                            animation: qq.maps.MarkerAnimation.DROP
                        });
                    }
                    mapContainer.toggle();
                    return false;
                });
            });
        }

        // init all popovers
        function initAllPopovers(optionForm) {
            optionForm.find('[data-toggle="popover"]').each(function(){
                var index = $(this).data('index');
                initPopover(index);
            });
            addPopoverfunction(optionForm);
        }

        // init a popover
        function initPopover(index) {
            var optionForm = $('#option-form');
            var myPopover = optionForm.find('tr[data-index=' + index + '] [data-toggle="popover"]');
            myPopover.popover({
                trigger: 'manual',
                animation: 'true',
                container: '#option-form tr[data-index=' + index + ']',
                placement: 'auto',
                title: '详细描述',
                html: true,
                content: getPopoverContent(index)
            });
        }

        function addPopoverfunction(optionForm){
            optionForm.on('click', '[data-toggle="popover"]', function() {
                $(this).popover('toggle');
            });

            // add save and cancle funciton to popover
            optionForm.on('inserted.bs.popover', '[data-toggle="popover"]', function() {
                var index = $(this).data('index');
                var myPopover = $(this);
                showPopoverContent(index);
            });

            optionForm.on('click', '.btn-cancle', function() {
                var index = $(this).data('index');
                var myPopover = optionForm.find('tr[data-index=' + index + '] [data-toggle="popover"]');
                myPopover.popover('toggle');
            });

            optionForm.on('click', '.btn-save', function() {
                var index = $(this).data('index');
                changePopoverContent(index);
                var myPopover = optionForm.find('tr[data-index=' + index + '] [data-toggle="popover"]');
                myPopover.popover('toggle');
            });
        }

        function getPopoverContent(index) {
            var popoverContent = $('#data-text' + index).html();
            return popoverContent;
        }

        function changePopoverContent(index) {
            var text = $('#option-form .popover-content textarea[data-index=' + index + ']').val();
            $('#data-text' + index + ' textarea').val(text);
         }

        function showPopoverContent(index) {
            var text = $('#data-text' + index + " textarea").val();
            $('#option-form .popover-content textarea[data-index=' + index + ']').val(text);
        }

        $(function () {
            var optionForm = $('#option-form');
            initEditor();
            initLocations();
            initMap();
            initOptions(optionForm);
            initAllPopovers(optionForm);
        });
    });
});