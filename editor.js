define(['jquery', 'sortable', 'tinymce', 'util', 'underscore', 'layzr', 'bootbox', 'animatescroll'], function ($, Sortable, tinymce, util, _, Layzr, bootbox) {
    var exports = {
            IS_CHANGED: false,
            BLOCK_TYPE_IMAGE: 'image',
            BLOCK_TYPE_VIDEO: 'video',
            BLOCK_TYPE_EMBED: 'embed',
            BLOCK_TYPE_TEXT: 'text',
            BLOCK_TYPE_PRODUCT: 'product',
        },
        defaultOptions = {
            blockSelector: '.block'
        },
        blockTemplates,
        toolbarTemplates,
        index = 1,
        nextIndex = function () {
            return index++;
        };

    bootbox.setDefaults({
        locale: 'zh_CN'
    });

    blockTemplates = {
        image: _.template('<div class="block block-<%- type %>" data-src="<%- src %>"> <div class="block-content"> <figure class="normal image-container"> <img src="<%- fullSrc %>"> <figcaption class="caption-container"> <input type="text" class="caption" value="<%- caption %>" placeholder="添加标题"> </figcaption> </figure> </div> </div>'),
        video: _.template('<div class="block block-<%- type %>" data-src="<%- src %>"> <div class="block-content"> <div class="video-container"> <video controls src="<%- fullSrc %>"></video> <div class="caption-container"> <input type="text" class="caption" value="<%- caption %>" placeholder="添加标题"> </div> </div> </div> </div>'),
        text: _.template('<div class="block block-<%- type %>"> <div class="block-content"> <div class="text-content placeholder" placeholder="请输入描述文字"></div> </div> </div>'),
        embed: _.template('<div class="block block-<%- type %>"> <div class="block-content"> <%= code %> <div class="caption-container"> <input type="text" class="caption" value="<%- caption %>" placeholder="添加标题"> </div> </div> </div>'),
        product: _.template('<div class="block block-<%- type %>" data-image-id="<%- imageId %>" data-related-id="<%- relatedId %>"> <div class="block-content"><div class="product-wrapper"><div class="img-wrapper"><a target="_blank" href="<%- showUrl %>"><img src="<%- fullSrc %>"></img><div class="product-name"><h4><%- name %></h4></div></a></div></div></div></div>')
    };

    toolbarTemplates = {
        image: '<div class="block-toolbar d-none clearfix">'
                + '<div class="tool-delete">'
                + '<button type="button" class="btn btn-danger delete">删除<span class="glyphicon glyphicon-remove"></span></button>'
                + '</div>'
                + '</div>',
        video: '<div class="block-toolbar d-none clearfix">'
                + '<div class="tool-delete">'
                + '<button type="button" class="btn btn-danger delete">删除<span class="glyphicon glyphicon-remove"></span></button>'
                + '</div>'
                + '</div>',
        embed: '<div class="block-toolbar d-none clearfix">'
                + '<div class="tool-delete">'
                + '<button type="button" class="btn btn-danger delete">删除<span class="glyphicon glyphicon-remove"></span></button>'
                + '</div>'
                + '</div>',
        text: '<div class="block-toolbar d-none clearfix">'
                + '<div class="tool-delete">'
                + '<button type="button" class="btn btn-danger delete">删除<span class="glyphicon glyphicon-remove"></span></button>'
                + '</div>'
                + '</div>',
        product: '<div class="block-toolbar d-none clearfix">'
                + '<div class="tool-delete">'
                + '<button type="button" class="btn btn-danger delete">删除<span class="glyphicon glyphicon-remove"></span></button>'
                + '</div>'
                + '</div>',
    };

    function Block() {}

    Block.init = function (block, options) {
        block.id = nextIndex();
        block.size = options.size || 'normal';
        block.options = options;
        if (options.element) {
            block.element = $(options.element);
            options = $.extend(true, {}, block.element.data(), options);
            block.options = options;
        } else {
            block.element = block.buildBlockElement();
        }
    }

    Block.create = function (options) {
        var block;
        switch (options.type) {
            case exports.BLOCK_TYPE_IMAGE:
                block = new ImageBlock(options);
                break;
            case exports.BLOCK_TYPE_VIDEO:
                block = new VideoBlock(options);
                break;
            case exports.BLOCK_TYPE_TEXT:
                block = new TextBlock(options);
                break;
            case exports.BLOCK_TYPE_EMBED:
                block = new EmbedBlock(options);
                break;
            case exports.BLOCK_TYPE_PRODUCT:
                block = new ProductBlock(options);
                break;
            default:
                block = null;
                break;
        }
        return block;
    };

    Block.prototype = {
        wrap: function () {
            return $(this.element).wrap('<div class="block-wrapper clearfix" id="block-' + this.id
                + '" data-id="' + this.id + '"></div>').closest('.block-wrapper');
        },
        addToolbar: function () {
            var toolbarHtml = toolbarTemplates[this.type];

            $(this.element).prepend(toolbarHtml);
        },
        buildBlockElement: function () {
            var blockHtml;
            if (this.type in blockTemplates) {
                blockHtml = blockTemplates[this.type](this);
            }

            return $(blockHtml);
        },
        init: function () {
            this.wrapElement = this.wrap();
            this.addToolbar();
            this.afterInit();
        },
        append: function (index) {
            if (index === undefined) {
                this.container.append(this.wrapElement);
            } else {
                if (index === 0) {
                    this.container.prepend(this.wrapElement);
                } else {
                    this.container.find('.block-wrapper:nth-child(' + (index + 1) + ')').after(this.wrapElement);
                }
            }

            this.afterAppend();
        },
        afterAppend: function () {
            // empty
        },
        afterInit: function () {
            // empty
        },
        remove: function () {
            this.wrapElement.remove();
        },
        update: function (data) {
            // TODO
        }
    };

    function ImageBlock(options) {
        this.type = options.type;
        this.src = options.src;
        this.caption = options.caption;
        this.fullSrc = util.getUrlByAliasName(options.src, 'content.image');
        Block.init(this, options);
    }

    ImageBlock.prototype = $.extend({}, Block.prototype, {
        afterInit: function () {
            $(this.element).find('.caption').replaceWith($('<input type="text" class="caption" placeholder="添加标题">').val(this.caption));
        },
        getData: function () {
            return {
                type: this.type,
                size: this.size || 'normal',
                src: this.src,
                caption: this.caption,
                mediaId: this.options.mediaId
            };
        }
    });

    function VideoBlock(options) {
        this.type = options.type;
        this.src = options.src;
        this.caption = options.caption;
        this.fullSrc = util.getCdnResource(options.src);
        Block.init(this, options);
    }

    VideoBlock.prototype = $.extend({}, Block.prototype, {
        afterInit: function () {
            $(this.element).find('.caption').replaceWith($('<input type="text" class="caption" placeholder="添加标题">').val(this.caption));
        },
        getData: function () {
            return {
                type: this.type,
                size: this.size || 'normal',
                src: this.src,
                caption: this.caption,
                mediaId: this.options.mediaId
            };
        }
    });

    function EmbedBlock(options) {
        this.type = options.type;
        this.caption = options.caption;
        this.code = util.strip_tags(options.code, '<object><param><embed><video><iframe>');
        Block.init(this, options);
    }

    EmbedBlock.prototype = $.extend({}, Block.prototype, {
        afterInit: function () {
            $(this.element).find('.caption').replaceWith($('<input type="text" class="caption" placeholder="添加标题">').val(this.caption));
        },
        getData: function () {
            return {
                type: this.type,
                size: this.size || 'normal',
                code: this.code,
                caption: this.caption
            };
        }
    });

    function TextBlock(options) {
        options.content = options.content || '';
        this.type = options.type;
        this.content = util.strip_tags(options.content, '<div><p><span><label>'
            + '<h1><h2><h3><h4><h5><h6>',
            + '<a><br>',
            + '<small><strong><sub><sup><del><em><i><b>',
            + '<blockquote><ins><code><output><pre>',
            + '<dd><dl><dt><li><ol><ul>');
        Block.init(this, options);
    }

    TextBlock.prototype = $.extend({}, Block.prototype, {
        afterInit: function () {
            var block = this;
            tinymce.init({
                selector: '#block-' + this.id + ' div.text-content',
                menubar: false,
                inline: true,
                theme: 'modern',
                language: 'zh_CN',
                plugins: 'lists link paste textcolor stylebuttons',
                toolbar: 'bold italic underline alignleft aligncenter alignright alignjustify bullist numlist Heading-h1',
                setup: function(editor) {
                    editor.on('input change', function () {
                        if ($(editor.getElement()).text() === '') {
                            $(block.element).find('.text-content').addClass('placeholder');
                        } else {
                            $(block.element).find('.text-content').removeClass('placeholder');
                        }
                    });

                    editor.on('blur', function () {
                        if ($(editor.getElement()).text() === '') {
                            $(block.element).find('.text-content').addClass('placeholder');
                        }
                    });

                    editor.on('focus', function () {
                        $(block.element).find('.text-content').removeClass('placeholder');
                    });

                    block.tinyeditor = editor;
                }
            });
        },
        afterAppend: function () {
            this.afterInit();
        },
        getData: function () {
            return {
                type: this.type,
                size: this.size || 'normal',
                content: this.tinyeditor.getContent()
            };
        }
    });

    function ProductBlock(options) {
        this.type = options.type;
        this.relatedId = options.relatedId;
        if (options.src != '') {
            this.fullSrc = util.getUrlByAliasName(options.src, 'content.image');
        } else {
            this.fullSrc = '/static/image/cover_image_1400x682.png';
        }
        this.name = options.name;
        this.username = options.username;
        this.location = options.location;
        this.description = options.description;
        this.showUrl = options.showUrl;
        this.imageId = options.imageId;
        Block.init(this, options);
    }

    ProductBlock.prototype = $.extend({}, Block.prototype, {
        getData: function () {
            return {
                type: this.type,
                size: this.size || 'normal',
                relatedId: this.relatedId,
                imageId: this.imageId
            };
        }
    });

    function EditorStore() {
        this.blocks = [];
    }

    EditorStore.prototype = {
        pushBlock: function (block) {
            this.blocks.push(block);
        },
        insertBlock: function (block, index) {
            this.blocks.splice(index, 0, block);
        },
        getBlock: function (id) {
            return _.findWhere(this.blocks, {id: id});
        },
        removeBlock: function (id) {
            var i = _.findIndex(this.blocks, {id: id});
            this.blocks.splice(i, 1);
        },
        getIndexById: function (id) {
            return _.findIndex(this.blocks, {id: id});
        },
        moveBlock: function (id, toIndex) {
            var index = _.findIndex(this.blocks, {id: id}),
                block;

            if (index !== undefined) {
                block = this.blocks[index];
                if (index == toIndex) {
                    return;
                }

                this.blocks.splice(index, 1);
                this.blocks.splice(toIndex, 0, block);
            }
        },
        getDatas: function () {
            return _.map(this.blocks, function (block) {
                return block.getData();
            });
        }
    };

    function initEvent(editor) {
        editor.blockContainer.on('click', '.delete', function () {
            var $this = $(this);
            //delete action
            /*bootbox.confirm({
                title: '删除',
                message: '确认删除该内容？',
                size: 'small',
                callback: function(result) {
                    if (!result) {
                        return;
                    }
                    var blockElement = $this.closest('.block-wrapper'),
                    blockId = blockElement.data('id');
                    editor.removeBlock(blockId);
                    exports.IS_CHANGED = true;
                }
            });*/
            var blockElement = $this.closest('.block-wrapper'),
            blockId = blockElement.data('id');
            editor.removeBlock(blockId);
            exports.IS_CHANGED = true;
        }).on('click', '.resizer-normal', function () {
            //resize image or video to normal size
            var blockElement = $(this).closest('.block-wrapper'),
                blockId = blockElement.data('id'),
                target = blockElement.find('.image-container, .video-container'),
                block = editor.store.getBlock(blockId);

            target.removeClass('full').addClass('normal');
            $(this).closest('.block').removeClass('full').addClass('normal');

            $(this).closest('.tool-resizer').find('.active').removeClass('active');
            $(this).addClass('active');

            block.size = 'normal';
        }).on('click', '.resizer-full', function() {
            //resize image or video to full screen size
            var blockElement = $(this).closest('.block-wrapper'),
                blockId = blockElement.data('id'),
                target = blockElement.find('.image-container, .video-container'),
                block = editor.store.getBlock(blockId);

            target.removeClass('normal').addClass('full');
            $(this).closest('.block').removeClass('normal').addClass('full');

            $(this).closest('.tool-resizer').find('.active').removeClass('active');
            $(this).addClass('active');

            block.size = 'full';
        }).on('change', '.caption', function () {
            var blockId = $(this).closest('.block-wrapper').data('id'),
                block = editor.store.getBlock(blockId);
            block.caption = $(this).val();
            exports.IS_CHANGED = true;
        }).on('focus', '.block-content:not(.block-product .block-content)', function() {
            var blockId = $(this).closest('.block-wrapper').data('id'),
                sortItem = editor.sortableContainer.find('#sort-item-' + blockId);
            sortItem.addClass('active');
        }).on('blur', '.block-content:not(.block-product .block-content)', function() {
            var blockId = $(this).closest('.block-wrapper').data('id'),
                sortItem = editor.sortableContainer.find('#sort-item-' + blockId);
            sortItem.removeClass('active');
        });

        editor.sortableContainer.on('click', '.sort-item', function() {
            var targetId = 'block-' + $(this).data('blockId');
            $('#' + targetId).animatescroll();
        });
    }

    function initSortable(editor) {
        if (editor.sortableContainer.length) {
            Sortable.create(editor.sortableContainer[0], {
                animation: 150,
                onMove: function (event) {
                    var current = $(event.dragged);
                    current.addClass('img-selected');
                },
                onEnd: function (event) {
                    var current = $(event.item),
                        blockId = current.data('block-id');
                    current.removeClass('img-selected');

                    editor.moveBlock(blockId, event.newIndex);
                    exports.IS_CHANGED = true;
                }
            });
        }
    }

    function Editor(options) {
        this.blockContainer = $(options.blockContainer),
        this.sortableContainer = $(options.sortableContainer);
        this.blockSelector = options.blockSelector;
        this.store = new EditorStore();
    }

    Editor.prototype = {
        init: function () {
            var editor = this;
            this.blockContainer.find(this.blockSelector).each(function () {
                var options = $(this).data(),
                    block;

                options.element = this;
                block = Block.create(options);
                if (block) {
                    //Block.init(block, options);
                    block.container = editor.blockContainer;
                    block.init();
                    editor.addSortItem(block);
                    editor.store.pushBlock(block);
                }
            });

            initEvent(this);
            initSortable(this);

            this.blockContainer.data('editor', this);
        },
        addBlock: function (options, index) {
            var block = Block.create(options);

            if (block) {
                block.init();
                if (index === undefined) {
                    this.pushBlock(block);
                } else {
                    this.insertBlock(block, index);
                }

                return block.id;
            }
        },
        pushBlock: function (block) {
            block.container = this.blockContainer;
            this.store.pushBlock(block);
            block.append();
            this.addSortItem(block);
        },
        insertBlock: function (block, index) {
            block.container = this.blockContainer;
            this.store.insertBlock(block, index);
            block.append(index);
            this.addSortItem(block, index);
        },
        removeBlock: function (id) {
            var index = this.store.getIndexById(id),
                block = this.store.getBlock(id);

            block.remove();
            this.removeSortItem(index);
            this.store.removeBlock(id);
        },
        moveBlock: function (id, toIndex) {
            var index = this.store.getIndexById(id),
                oldIndex,
                block;

            if (index !== undefined) {
                block = this.store.getBlock(id);
                oldIndex = block.wrapElement.index();
                if (index == toIndex) {
                    return;
                }

                if (oldIndex != toIndex) {
                    if (toIndex == 0) {
                        this.blockContainer.prepend(block.wrapElement);
                    } else if (toIndex > oldIndex) {
                        this.blockContainer.find('.block-wrapper:nth-child(' + (toIndex + 1) + ')').after(block.wrapElement);
                    } else {
                        this.blockContainer.find('.block-wrapper:nth-child(' + toIndex + ')').after(block.wrapElement);
                    }
                }

                this.store.moveBlock(id, toIndex);
            }
        },
        updateBlock: function (id, options) {
            var block = this.store.getBlock(id);
            block.options = $.extend(true, {}, block.options, options);
            // TODO
        },
        addSortItem: function (block, index) {
            var itemHtml = '<li id="sort-item-' + block.id
                + '" data-block-id="' + block.id + '" class="sort-item thumb-' + block.type + '">';

            if (block.type === 'image' && block.src) {
                itemHtml += '<img src="' + util.getUrlByAliasName(block.src, 'product.hero.wm') + '">';
            }
            itemHtml += '</li>';

            if (index !== undefined) {
                if (index == 0) {
                    this.sortableContainer.prepend(itemHtml);
                } else {
                    this.sortableContainer.find('.sort-item:nth-child(' + index + ')').after(itemHtml);
                }
            } else {
                this.sortableContainer.append(itemHtml);
            }
        },
        removeSortItem: function (index) {
            this.sortableContainer.find('.sort-item:nth-child(' + (index + 1) + ')').remove();
        },
        getDataArray: function () {
            return this.store.getDatas();
        }
    };

    exports.init = function (options) {
        options = $.extend(true, {}, defaultOptions, options);
        var blockContainer = $(options.blockContainer),
            editor;
        if (editor = blockContainer.data('editor')) {
            return editor;
        }

        editor = new Editor(options);
        editor.init();

        new Layzr();

        return editor;
    };

    return exports;
});