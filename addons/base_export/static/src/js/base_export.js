openerp.base_export = function(openerp) {
QWeb.add_template('/base_export/static/src/xml/base_export.xml');
openerp.base.views.add('export', 'openerp.base_export.Export');
openerp.base_export.Export = openerp.base.Dialog.extend({

    init: function(session, dataset, views){
        this._super(session);
        this.dataset = dataset
        this.selected_fields = {};
    },

    start: function() {
        var self = this
        self._super(false);
        self.template = 'ExportTreeView';
        self.dialog_title = "Export Data "
        self.open({
                    modal: true,
                    width: '50%',
                    height: 'auto',
                    position: 'top',
                    buttons : {
                        "Close" : function() {
                            self.close();
                          },
                        "Export To File" : function() {
                            self.get_fields();
                          }
                       },
                    close: function(event, ui){ self.close();}
                   });
        $('#add_field').click(function(){
            for (var key in self.selected_fields) {
                self.add_field(key, self.selected_fields[key])
            }
        });
        $('#remove_field').click(function(){
            jQuery(self.$dialog).find("#fields_list option:selected").remove();
        });
        $('#remove_all_field').click(function(){
            jQuery(self.$dialog).find("#fields_list option").remove();
        });
        $('#export_new_list').click(function(){
            self.on_show_save_list();
        });
        this.rpc("/base_export/export/get_fields", {"model": this.dataset.model}, this.on_show_data);
    },
    on_show_save_list: function(){
        var self = this;
        var current_node = $("#savenewlist");
        if(!(current_node.find("label")).length){
            current_node.append(QWeb.render('ExportNewList'));
            current_node.find("#add_export_list").click(function(){
                var value = current_node.find("#savelist_name").val();
                if (value){
                    self.do_save_export_list(value);
                }
                else{
                    alert("Pleae Enter Save Field List Name");
                }

            });
        }
        else{
            if (current_node.is(':hidden')){
                current_node.show();
            }
            else{
               current_node.hide();
            }
        }
    },

    do_save_export_list: function(value){
        var export_field = this.get_fields()
        if(export_field.length){
            this.rpc("/base_export/export/save_export_lists", {"model": this.dataset.model, "name":value, "field_list":export_field}, {});
        }
    },

    on_click: function(id, result) {
        var self = this
        self.field_id = id.split("-")[1];
        var model = ''
        var prefix = ''
        var name = ''
        var is_loaded = 0;
        _.each(result, function(record) {
            if(record['id'] == self.field_id && (record['children']).length >= 1){
                model = record['params']['model']
                prefix = record['params']['prefix']
                name = record['params']['name']
                $(record['children']).each (function(e, childid) {
                    if ($("tr[id='treerow-" + childid +"']").length > 0) {
                        if ($("tr[id='treerow-" + childid +"']").is(':hidden')) {
                            is_loaded = -1;
                        } else {
                            is_loaded++;
                        }
                    }
                });
                if (is_loaded == 0) {
                    if ($("tr[id='treerow-" + self.field_id +"']").find('img').attr('src') == '/base/static/src/img/expand.gif') {
                        if (model){
                            self.rpc("/base_export/export/get_fields", {"model": model, "prefix": prefix, "field_parent" : self.field_id, "name": name}, function (results) {
                                self.on_show_data(results);
                            });
                        }
                    }
                } else if (is_loaded > 0) {
                    self.showcontent(self.field_id, true);
                } else {
                    self.showcontent(self.field_id, false);
                }
            }

        });
    },

    on_show_data: function(result) {
        var self = this;
        var current_tr = $("tr[id='treerow-" + self.field_id + "']");
        if (current_tr.length >= 1){
            current_tr.find('img').attr('src','/base/static/src/img/collapse.gif');
            current_tr.after(QWeb.render('ExportTreeView-Secondary', {'fields': result}));
        }
        else{
            $('#left_field_panel').append(QWeb.render('ExportTreeView-Secondary',  {'fields': result}));
        }
        $('img[id ^= parentimg]').click(function(){
            self.on_click(this.id, result);
        });
        $('[id^=export-]').dblclick(function(){
            self.add_field(this.id.split('-')[1], this.text)
        });
        $('[id^=export-]').click(function(){
            self.on_field_click(this);
        });
        $("tr[id^='treerow-']").keydown(function (e) {
	        var keyCode = e.keyCode || e.which;
	        arrow = {left: 37, up: 38, right: 39, down: 40 };
	        switch (keyCode) {
	            case arrow.left:
	                if( jQuery(this).find('img').attr('src') == '/base/static/src/img/collapse.gif'){
	                    self.on_click(this.id, result);
	                }
	               break;
	            case arrow.up:
	                //..
	               break;
	            case arrow.right:
	                if( jQuery(this).find('img').attr('src') == '/base/static/src/img/expand.gif'){
	                    self.on_click(this.id, result);
	                }
	               break;
	            case arrow.down:
	                //..
	               break;
	        }
        });

        $('#fields_list').mouseover(function(event){
            if(event.relatedTarget){
                if ('id' in event.relatedTarget.attributes && 'string' in event.relatedTarget.attributes){
                    field_id = event.relatedTarget.attributes["id"]["value"]
                    if (field_id && field_id.split("-")[0] == 'export'){
                        self.add_field(field_id.split("-")[1], event.relatedTarget.attributes["string"]["value"]);
                    }
                }
            }
        });
    },

    on_field_click: function(ids){
        var self = this;
        field_id = ids.id.split("-")[1];
        self.selected_fields = {};
        if (!(field_id in self.selected_fields)){
            self.selected_fields[field_id] = ids.text;
        }
    },

    // show & hide the contents
    showcontent: function (id, flag) {
        var first_child = $("tr[id='treerow-" + id + "']").find('img')
        if (flag) {
            first_child.attr('src', '/base/static/src/img/expand.gif');
        }
        else {
            first_child.attr('src', '/base/static/src/img/collapse.gif');
        }
        var child_field = $("tr[id^='treerow-" + id +"/']")
        var child_len = (id.split("/")).length + 1
        for (var i = 0; i < child_field.length; i++) {
            if (flag) {
                $(child_field[i]).hide();
            }
            else {
                if(child_len ==  (child_field[i].id.split("/")).length){
                    if( jQuery(child_field[i]).find('img').attr('src') == '/base/static/src/img/collapse.gif'){
                        jQuery(child_field[i]).find('img').attr('src', '/base/static/src/img/expand.gif')
                    }
                    $(child_field[i]).show();
                }
            }
        }
    },

    add_field: function(field_id, string) {
        var field_list = $('#fields_list')
        if ( $("#fields_list option[value='" + field_id + "']") && !$("#fields_list option[value='" + field_id + "']").length){
            field_list.append( new Option(string, field_id));
        }
    },

    get_fields: function (){
        var export_field = [];
        jQuery("#fields_list option").each(function(){
            export_field.push(jQuery(this).val());
        });
        if (! export_field.length){
            alert('Please select fields to export...');
        }
        return export_field;
    },

    close: function() {
        jQuery(this.$dialog).remove();
        this._super();
    },

});

};
